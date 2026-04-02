/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { IncomingMessage } from 'http';
import { from, map, switchMap, throwError } from 'rxjs';
import type { UrlObject } from 'url';
import { format, parse } from 'url';
import { inspect } from 'util';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import type {
  ChatCompleteAPI,
  OutputAPI,
  ChatCompletionEvent,
  InferenceTaskErrorEvent,
  ChatCompleteOptions,
  ChatCompleteAPIResponse,
} from '@kbn/inference-common';
import {
  InferenceTaskError,
  InferenceTaskEventType,
  createInferenceInternalError,
  withoutOutputUpdateEvents,
  type InferenceConnector,
} from '@kbn/inference-common';
import type { ChatCompleteRequestBody } from '../../common/http_apis';
import { createOutputApi } from '../../common/output/create_output_api';
import { eventSourceStreamIntoObservable } from '../../server/util/event_source_stream_into_observable';

// eslint-disable-next-line spaced-comment
/// <reference types="@kbn/ambient-ftr-types"/>

export interface ScriptInferenceClient {
  getConnectorId: () => string;
  chatComplete: ChatCompleteAPI;
  output: OutputAPI;
}

interface FetchResponseError extends Error {
  status?: number;
  responseData?: unknown;
  responseHeaders?: Record<string, string>;
  responseStatusText?: string;
}

function isFetchError(error: unknown): error is FetchResponseError {
  return error instanceof Error && 'status' in error;
}

export class KibanaClient {
  private readonly defaultHeaders: Record<string, string>;

  constructor(
    private readonly log: ToolingLog,
    private readonly url: string,
    private readonly spaceId?: string
  ) {
    this.defaultHeaders = {
      'kbn-xsrf': 'foo',
    };
  }

  private getUrl(props: { query?: UrlObject['query']; pathname: string; ignoreSpaceId?: boolean }) {
    const parsed = parse(this.url);

    const baseUrl = parsed.pathname?.replaceAll('/', '') ?? '';

    const url = format({
      ...parsed,
      pathname: `/${[
        ...(baseUrl ? [baseUrl] : []),
        ...(props.ignoreSpaceId || !this.spaceId ? [] : ['s', this.spaceId]),
        props.pathname.startsWith('/') ? props.pathname.substring(1) : props.pathname,
      ].join('/')}`,
      query: props.query,
    });

    return url;
  }

  async callKibana<T>(
    method: string,
    props: { query?: UrlObject['query']; pathname: string; ignoreSpaceId?: boolean },
    data?: any
  ): Promise<{ status: number; data: T; headers: Record<string, string> }> {
    const url = this.getUrl(props);
    const resp = await fetch(url, {
      method,
      headers: {
        ...this.defaultHeaders,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'foo',
        'Content-Type': 'application/json',
      },
      body: data !== undefined ? JSON.stringify(data) : JSON.stringify({}),
    }).catch((error) => {
      throw error;
    });

    if (!resp.ok) {
      const respBody = await resp.text().catch(() => '');
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(respBody);
      } catch {
        parsedBody = respBody;
      }

      const error: FetchResponseError = new Error(`Request failed with status ${resp.status}`);
      error.status = resp.status;
      error.responseData = parsedBody;
      error.responseStatusText = resp.statusText;
      const responseHeaders: Record<string, string> = {};
      resp.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      error.responseHeaders = responseHeaders;

      const interestingPartsOfError = {
        message: error.message,
        status: error.status,
        responseData: error.responseData,
        responseHeaders: error.responseHeaders,
        responseStatusText: error.responseStatusText,
      };
      this.log.error(inspect(interestingPartsOfError, { depth: 10 }));

      throw error;
    }

    const responseHeaders: Record<string, string> = {};
    resp.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseData = (await resp.json()) as T;
    return { status: resp.status, data: responseData, headers: responseHeaders };
  }

  async createSpaceIfNeeded() {
    if (!this.spaceId) {
      return;
    }

    this.log.debug(`Checking if space ${this.spaceId} exists`);

    let spaceExistsResponse: { status: number; data: { id?: string } };
    try {
      spaceExistsResponse = await this.callKibana<{ id?: string }>('GET', {
        pathname: `/api/spaces/space/${this.spaceId}`,
        ignoreSpaceId: true,
      });
    } catch (error) {
      if (isFetchError(error) && error.status === 404) {
        spaceExistsResponse = {
          status: 404,
          data: {
            id: undefined,
          },
        };
      } else {
        throw error;
      }
    }

    if (spaceExistsResponse.data.id) {
      this.log.debug(`Space id ${this.spaceId} found`);
      return;
    }

    this.log.info(`Creating space ${this.spaceId}`);

    const spaceCreatedResponse = await this.callKibana<{ id: string }>(
      'POST',
      {
        pathname: '/api/spaces/space',
        ignoreSpaceId: true,
      },
      {
        id: this.spaceId,
        name: this.spaceId,
      }
    );

    if (spaceCreatedResponse.status === 200) {
      this.log.info(`Created space ${this.spaceId}`);
    } else {
      throw new Error(
        `Error creating space: ${spaceCreatedResponse.status} - ${spaceCreatedResponse.data}`
      );
    }
  }

  createInferenceClient({ connectorId }: { connectorId: string }): ScriptInferenceClient {
    function streamResponse(responsePromise: Promise<Response>) {
      return from(responsePromise).pipe(
        switchMap((response) => {
          if (response.body) {
            const nodeStream = Readable.fromWeb(
              response.body as unknown as WebReadableStream
            ) as IncomingMessage;
            return eventSourceStreamIntoObservable(nodeStream);
          }
          return throwError(() => createInferenceInternalError('Unexpected error'));
        }),
        map((line) => {
          return JSON.parse(line) as ChatCompletionEvent | InferenceTaskErrorEvent;
        }),
        map((line) => {
          if (line.type === InferenceTaskEventType.error) {
            throw new InferenceTaskError(line.error.code, line.error.message, line.error.meta);
          }
          return line;
        })
      );
    }

    const chatCompleteApi: ChatCompleteAPI = <TOptions extends ChatCompleteOptions>({
      connectorId: chatCompleteConnectorId,
      messages,
      system,
      toolChoice,
      tools,
      functionCalling,
      stream,
    }: TOptions): ChatCompleteAPIResponse<TOptions> => {
      const body: ChatCompleteRequestBody = {
        connectorId: chatCompleteConnectorId,
        system,
        messages,
        toolChoice,
        tools,
        functionCalling,
      };

      if (stream) {
        return streamResponse(
          fetch(
            this.getUrl({
              pathname: `/internal/inference/chat_complete/stream`,
            }),
            {
              method: 'POST',
              headers: {
                ...this.defaultHeaders,
                'kbn-xsrf': 'true',
                'x-elastic-internal-origin': 'foo',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            }
          )
        ) as ChatCompleteAPIResponse<TOptions>;
      }

      return fetch(
        this.getUrl({
          pathname: `/internal/inference/chat_complete`,
        }),
        {
          method: 'POST',
          headers: {
            ...this.defaultHeaders,
            'kbn-xsrf': 'true',
            'x-elastic-internal-origin': 'foo',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      ).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      }) as ChatCompleteAPIResponse<TOptions>;
    };

    const outputApi: OutputAPI = createOutputApi(chatCompleteApi);

    return {
      getConnectorId: () => connectorId,
      chatComplete: (options) => {
        return chatCompleteApi({
          ...options,
        });
      },
      output: (options) => {
        const response = outputApi({ ...options });
        if (options.stream) {
          return (response as any).pipe(withoutOutputUpdateEvents());
        } else {
          return response;
        }
      },
    };
  }

  async getConnectors() {
    const response = await this.callKibana<{ connectors: InferenceConnector[] }>('GET', {
      pathname: '/internal/inference/connectors',
    });

    return response.data.connectors;
  }
}

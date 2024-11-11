/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import { omit, pick } from 'lodash';
import { UrlObject, format, parse } from 'url';
import { inspect } from 'util';

export class KibanaClient {
  public readonly axios: AxiosInstance;

  constructor(
    private readonly log: ToolingLog,
    private readonly url: string,
    private readonly spaceId?: string
  ) {
    this.axios = axios.create({
      headers: {
        'kbn-xsrf': 'foo',
      },
    });
  }

  public getUrl(props: { query?: UrlObject['query']; pathname: string; ignoreSpaceId?: boolean }) {
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

  callKibana<T>({
    method,
    pathname,
    query,
    ignoreSpaceId,
    data,
  }: {
    method: string;
    pathname: string;
    query?: UrlObject['query'];
    ignoreSpaceId?: boolean;
    data?: any;
  }): Promise<AxiosResponse<T>> {
    const url = this.getUrl({ pathname, query, ignoreSpaceId });
    return this.axios<T>({
      method,
      url,
      data: data || {},
      headers: {
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'foo',
      },
    }).catch((error) => {
      if (isAxiosError(error)) {
        const interestingPartsOfError = {
          ...omit(error, 'request', 'response', 'config'),
          ...pick(
            error,
            'response.data',
            'response.headers',
            'response.status',
            'response.statusText'
          ),
        };
        this.log.error(inspect(interestingPartsOfError, { depth: 10 }));
      }
      throw error;
    });
  }

  async createSpaceIfNeeded() {
    if (!this.spaceId) {
      return;
    }

    this.log.debug(`Checking if space ${this.spaceId} exists`);

    const spaceExistsResponse = await this.callKibana<{
      id?: string;
    }>({
      method: 'GET',
      pathname: `/api/spaces/space/${this.spaceId}`,
      ignoreSpaceId: true,
    }).catch((error) => {
      if (isAxiosError(error) && error.response?.status === 404) {
        return {
          status: 404,
          data: {
            id: undefined,
          },
        };
      }
      throw error;
    });

    if (spaceExistsResponse.data.id) {
      this.log.debug(`Space id ${this.spaceId} found`);
      return;
    }

    this.log.info(`Creating space ${this.spaceId}`);

    const spaceCreatedResponse = await this.callKibana<{ id: string }>({
      method: 'POST',
      pathname: '/api/spaces/space',
      ignoreSpaceId: true,
      data: {
        id: this.spaceId,
        name: this.spaceId,
      },
    });

    if (spaceCreatedResponse.status === 200) {
      this.log.info(`Created space ${this.spaceId}`);
    } else {
      throw new Error(
        `Error creating space: ${spaceCreatedResponse.status} - ${spaceCreatedResponse.data}`
      );
    }
  }
}

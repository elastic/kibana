/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import { ResponseError, ResponseMessage } from './jsonrpc';

export { TextDocumentMethods } from './text_document_methods';

export interface LspClient {
  sendRequest(method: string, params: any, singal?: AbortSignal): Promise<ResponseMessage>;
}

export class LspRestClient implements LspClient {
  private baseUri: string;

  constructor(baseUri: string) {
    this.baseUri = baseUri;
  }

  public async sendRequest(
    method: string,
    params: any,
    signal?: AbortSignal
  ): Promise<ResponseMessage> {
    try {
      const response = await npStart.core.http.post(`${this.baseUri}/${method}`, {
        body: JSON.stringify(params),
        signal,
      });
      return response as ResponseMessage;
    } catch (e) {
      let error = e;
      if (error.body && error.body.error) {
        error = error.body.error;
      }
      throw new ResponseError(error.code, error.message, error.data);
    }
  }
}

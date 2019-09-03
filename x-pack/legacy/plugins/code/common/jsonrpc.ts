/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UnknownErrorCode } from './lsp_error_codes';

// Since vscode-jsonrpc can't be used under IE, we copy some type definitions from
// https://github.com/Microsoft/vscode-languageserver-node/blob/8801c20b/jsonrpc/src/messages.ts

/**
 * An error object return in a response in case a request
 * has failed.
 */
export class ResponseError extends Error {
  public readonly code: number;
  public readonly data: any | undefined;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.code = Number.isInteger(code) ? code : UnknownErrorCode;
    this.data = data;
    Object.setPrototypeOf(this, ResponseError.prototype);
  }

  public toJson() {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }
}

export interface Message {
  jsonrpc: string;
}

/**
 * A response message.
 */
export interface ResponseMessage extends Message {
  /**
   * The request id.
   */
  id: number | string | null;
  /**
   * The result of a request. This can be omitted in
   * the case of an error.
   */
  result?: any;
  /**
   * The error object in case a request fails.
   */
  error?: ResponseError;
}

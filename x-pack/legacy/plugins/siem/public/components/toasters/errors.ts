/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class ToasterError extends Error {
  public messages: string[];

  constructor(messages: string[]) {
    super(messages[0]);
    this.name = 'ToasterError';
    this.messages = messages;
  }
}

export const isToasterError = (error: unknown): error is ToasterError =>
  error instanceof ToasterError;

export interface KibanaApiError {
  body: {
    message: string;
    status_code: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isApiError = (error: any): error is KibanaApiError => error?.body?.message;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare class BulkUpdateError extends Error {
  private _statusCode;
  private _type;
  constructor({
    statusCode,
    message,
    type,
  }: {
    statusCode: number;
    message?: string;
    type: string;
  });
  get statusCode(): number;
  get type(): string;
}
export declare function getBulkUpdateStatusCode(error: Error | BulkUpdateError): number | undefined;
export declare function getBulkUpdateErrorType(error: Error | BulkUpdateError): string | undefined;
export declare function isClusterBlockException(error: Error | BulkUpdateError): boolean;

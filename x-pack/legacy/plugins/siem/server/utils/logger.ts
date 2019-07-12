/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const LOGGING_TAGS = ['siem'];

// Definition is from:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/hapi/v16/index.d.ts#L318
export type HapiLogger = (
  tags: string | string[],
  // eslint-disable-next-line
  data?: string | Object | Function,
  timestamp?: number
) => void;

export interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export const createLogger = (logger: HapiLogger): Readonly<Logger> => ({
  debug: (message: string) => logger(['debug', ...LOGGING_TAGS], message),
  info: (message: string) => logger(['info', ...LOGGING_TAGS], message),
  warn: (message: string) => logger(['warning', ...LOGGING_TAGS], message),
  error: (message: string) => logger(['error', ...LOGGING_TAGS], message),
});

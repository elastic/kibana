/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ESErrorCausedBy {
  type?: string;
  reason?: string;
  caused_by?: ESErrorCausedBy;
}

export interface ESError {
  root_cause?: ESErrorCausedBy[];
  caused_by?: ESErrorCausedBy;
}

export interface ESErrorBody {
  error?: ESError;
  status?: number;
}

export interface ESErrorMeta {
  body?: ESErrorBody;
  statusCode?: number;
}
export interface ElasticsearchResponseError {
  name?: string;
  meta?: ESErrorMeta;
}

function extractCausedByChain(
  causedBy: ESErrorCausedBy = {},
  accumulator: string[] = []
): string[] {
  const { reason, caused_by: innerCausedBy } = causedBy;

  if (reason && !accumulator.includes(reason)) {
    accumulator.push(reason);
  }

  if (innerCausedBy) {
    return extractCausedByChain(innerCausedBy, accumulator);
  }

  return accumulator;
}

/**
 * Identified causes for ES Error
 *
 * @param err Object Error thrown by ES JS client
 * @return ES error cause
 */
export function identifyEsError(err: ElasticsearchResponseError) {
  if (!err.meta) {
    return [];
  }
  const {
    meta: { body: response },
  } = err;
  if (response) {
    const { error } = response;
    if (error) {
      const { root_cause: rootCause = [], caused_by: causedBy } = error;

      return [
        ...extractCausedByChain(causedBy),
        ...rootCause.reduce(
          (acc: string[], innerRootCause) => extractCausedByChain(innerRootCause, acc),
          []
        ),
      ];
    }
  }
  return [];
}

export function isEsCannotExecuteScriptError(err: ElasticsearchResponseError): boolean {
  return identifyEsError(err).includes('cannot execute [inline] scripts');
}

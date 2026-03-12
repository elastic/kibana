/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface EsErrorStatusShape {
  statusCode?: number;
  meta?: {
    statusCode?: number;
  };
}

const getStatusCodes = (error: unknown): [number | undefined, number | undefined] => {
  const errorData = error as EsErrorStatusShape;
  return [errorData?.statusCode, errorData?.meta?.statusCode];
};

export const isConflictError = (error: unknown): boolean => {
  const [statusCode, metaStatusCode] = getStatusCodes(error);
  return statusCode === 409 || metaStatusCode === 409;
};

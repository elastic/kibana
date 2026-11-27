/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const createServiceError = (error: Error, message: string) => {
  // Some HTTP clients attach the parsed response body on `error.response.data`;
  // prefer the upstream `message` field if it is present.
  const responseData = (error as { response?: { data?: { message?: string } } }).response?.data;
  const errorMessage = responseData?.message || error.message;
  return new Error(`${message}. Error: ${errorMessage}`);
};

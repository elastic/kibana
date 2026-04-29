/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosHeaderValue } from 'axios';

interface GetBasicAuthHeaderArgs {
  username: string;
  password: string;
}

type CombineHeadersWithBasicAuthHeader = Partial<GetBasicAuthHeaderArgs> & {
  headers?: Record<string, AxiosHeaderValue> | null;
};

export const getBasicAuthHeader = ({ username, password }: GetBasicAuthHeaderArgs) => {
  const header = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  return { Authorization: header };
};

export const combineHeadersWithBasicAuthHeader = ({
  username,
  password,
  headers,
}: CombineHeadersWithBasicAuthHeader = {}) => {
  return username != null && password != null
    ? { ...getBasicAuthHeader({ username, password }), ...headers }
    : headers ?? undefined;
};

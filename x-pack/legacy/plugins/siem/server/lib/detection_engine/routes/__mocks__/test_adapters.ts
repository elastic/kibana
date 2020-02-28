/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IKibanaResponse } from '../../../../../../../../../src/core/server';
import { responseMock } from './response_factory';

type ResponseMock = ReturnType<typeof responseMock.create>;
type Method = keyof ResponseMock;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockCall = any;

interface ResponseCall {
  body: IKibanaResponse['payload'];
  status: number;
}

interface Response extends ResponseCall {
  calls: ResponseCall[];
}

const buildResponses = (method: Method, calls: MockCall[]): ResponseCall[] => {
  if (!calls.length) return [];

  switch (method) {
    case 'ok':
      return calls.map(call => ({ status: 200, body: call[0].body }));
    case 'badRequest':
      return calls.map(call => ({ status: 400, body: call }));
    case 'internalError':
      return calls.map(call => ({ status: 500, body: call }));
    case 'customError':
      return calls.map(call => ({ status: 500, body: call }));
    default:
      throw new Error(`Encountered unexpected method call from ${method}`);
  }
};

export const responseAdapter = (response: ResponseMock): Response => {
  const methods = Object.keys(response) as Method[];
  const calls = methods
    .reduce((responses, method) => {
      const methodMock = response[method];
      return [...responses, ...buildResponses(method, methodMock.mock.calls)];
    }, [] as Response['calls'])
    .sort((call, other) => other.status - call.status);

  const [{ body, status }] = calls;

  return {
    body,
    status,
    calls,
  };
};

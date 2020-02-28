/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { responseMock } from './response_factory';

type ResponseMock = ReturnType<typeof responseMock.create>;
type Method = keyof ResponseMock;

type MockCall = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface ResponseCall {
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  status: number;
}

interface Response extends ResponseCall {
  calls: ResponseCall[];
}

const buildResponses = (method: Method, calls: MockCall[]): ResponseCall[] => {
  if (!calls.length) return [];

  switch (method) {
    case 'ok':
      return calls.map(([call]) => ({ status: 200, body: call?.body }));
    case 'badRequest':
      return calls.map(([call]) => ({
        status: 400,
        body: { message: call?.body, statusCode: 400 },
      }));
    case 'notFound':
      return calls.map(([call]) => ({
        status: 404,
        body: { message: call?.body, statusCode: 404 },
      }));
    case 'conflict':
      return calls.map(([call]) => ({
        status: 409,
        body: { message: call?.body, statusCode: 409 },
      }));
    case 'internalError':
      return calls.map(([call]) => ({
        status: 500,
        body: { message: call?.body, statusCode: 500 },
      }));
    case 'customError':
      return calls.map(([call]) => ({
        status: call?.statusCode,
        body: { message: call?.body, statusCode: call?.statusCode },
      }));
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

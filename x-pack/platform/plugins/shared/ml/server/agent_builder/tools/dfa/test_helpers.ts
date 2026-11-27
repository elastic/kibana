/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerReturn } from '@kbn/agent-builder-server';
import type { MlCapabilities } from '@kbn/ml-common-types/capabilities';
import { getAdminCapabilities } from '../../../lib/capabilities/__mocks__/ml_capabilities';

export const adminCapabilities = () => getAdminCapabilities();

export const resolveWith = (capabilities: MlCapabilities) =>
  jest.fn().mockResolvedValue(capabilities);

export const createContext = (
  indicesDelete = jest.fn().mockResolvedValue({ acknowledged: true })
) =>
  ({
    esClient: { asCurrentUser: { indices: { delete: indicesDelete } } },
    savedObjectsClient: {},
    request: {},
  } as any);

export const securityException = (reason: string) => ({
  statusCode: 403,
  body: { error: { type: 'security_exception', reason } },
});

export const resultData = (result: ToolHandlerReturn) => {
  if (!('results' in result)) {
    return undefined;
  }
  const data = result.results[0]?.data;
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  return data as { message?: string } & Record<string, unknown>;
};

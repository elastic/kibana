/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../../common/types/domain';
import { createCasesStepHandler, normalizeCaseStepUpdatesForBulkPatch } from './utils';
import { createStepHandlerContext } from './test_utils';

describe('normalizeCaseStepUpdatesForBulkPatch', () => {
  it('normalizes assignees and connector fields while preserving other fields', () => {
    expect(
      normalizeCaseStepUpdatesForBulkPatch({
        assignees: null,
        connector: {
          id: 'webhook-id',
          name: 'Webhook',
          type: ConnectorTypes.casesWebhook,
          fields: null,
        },
        title: 'Updated title',
      })
    ).toEqual({
      connector: {
        id: 'webhook-id',
        name: 'Webhook',
        type: ConnectorTypes.casesWebhook,
        fields: null,
      },
      title: 'Updated title',
    });
  });

  it('preserves non-null assignees', () => {
    expect(
      normalizeCaseStepUpdatesForBulkPatch({
        assignees: [{ uid: 'u-1' }],
      })
    ).toEqual({
      assignees: [{ uid: 'u-1' }],
    });
  });
});

describe('createCasesStepHandler', () => {
  const createContext = (params?: { input?: unknown; config?: Record<string, unknown> }) =>
    createStepHandlerContext({
      input: params?.input,
      config: params?.config,
      stepType: 'cases.custom',
    });

  it('returns output case on success', async () => {
    const createdCase = {
      id: 'case-1',
      connector: { id: 'none' },
    };
    const operation = jest.fn().mockResolvedValue(createdCase);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { push: jest.fn() },
    });

    const handler = createCasesStepHandler(getCasesClient, operation);
    const context = createContext({ input: { foo: 'bar' }, config: {} });
    const result = await handler(context);

    expect(operation).toHaveBeenCalledWith(expect.any(Object), { foo: 'bar' }, {});
    expect(result).toEqual({
      output: {
        case: createdCase,
      },
    });
  });

  it('calls push when push-case is enabled', async () => {
    const push = jest.fn();
    const createdCase = {
      id: 'case-1',
      connector: { id: 'connector-1' },
    };
    const operation = jest.fn().mockResolvedValue(createdCase);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { push },
    });

    const handler = createCasesStepHandler(getCasesClient, operation);
    await handler(createContext({ config: { 'push-case': true } }));

    expect(push).toHaveBeenCalledWith({
      caseId: 'case-1',
      connectorId: 'connector-1',
      pushType: 'automatic',
    });
  });

  it('returns error when operation throws', async () => {
    const operationError = new Error('operation failed');
    const operation = jest.fn().mockRejectedValue(operationError);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { push: jest.fn() },
    });

    const handler = createCasesStepHandler(getCasesClient, operation);
    const result = await handler(createContext());

    expect(result).toEqual({ error: operationError });
  });
});

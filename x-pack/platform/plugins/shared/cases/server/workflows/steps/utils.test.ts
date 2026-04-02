/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../../common/types/domain';
import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../../common/bundled-types.gen';
import {
  createCasesStepHandler,
  normalizeCaseStepUpdatesForBulkPatch,
  safeParseCaseForWorkflowOutput,
} from './utils';
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

  it('maps errors via onError callback when provided', async () => {
    const operationError = new Error('operation failed');
    const operation = jest.fn().mockRejectedValue(operationError);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { push: jest.fn() },
    });

    const handler = createCasesStepHandler(getCasesClient, operation, {
      onError: () => new Error('mapped error'),
    });
    const result = await handler(createContext());

    expect(result).toEqual({
      error: new Error('mapped error'),
    });
  });
});

describe('safeParseCaseForWorkflowOutput', () => {
  it('preserves supported comment variants and nullable alert rule fields', () => {
    const eventComment = {
      id: 'event-comment-id',
      type: 'event' as const,
      eventId: ['event-1'],
      index: ['.ds-logs-*'],
      owner: createCaseResponseFixture.owner,
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: createCaseResponseFixture.created_by,
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
      version: 'WzQ3LDFc',
    };

    const alertCommentWithNullRule = {
      id: 'alert-comment-id',
      type: 'alert' as const,
      alertId: ['alert-1'],
      index: ['.alerts-security.alerts-default'],
      owner: createCaseResponseFixture.owner,
      rule: { id: null, name: null },
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: createCaseResponseFixture.created_by,
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
      version: 'WzQ3LDFc',
    };

    const actionsComment = {
      id: 'actions-comment-id',
      type: 'actions' as const,
      comment: 'Isolated host from response action',
      actions: {
        targets: [{ hostname: 'host-1', endpointId: 'endpoint-1' }],
        type: 'isolate',
      },
      owner: createCaseResponseFixture.owner,
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: createCaseResponseFixture.created_by,
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
      version: 'WzQ3LDFc',
    };

    const result = safeParseCaseForWorkflowOutput(CaseResponsePropertiesSchema, {
      ...createCaseResponseFixture,
      comments: [eventComment, actionsComment, alertCommentWithNullRule],
    });

    expect(result.comments).toEqual([eventComment, actionsComment, alertCommentWithNullRule]);
  });

  it('does not throw when output cannot be parsed', () => {
    const invalidCasePayload = {
      id: createCaseResponseFixture.id,
      comments: [],
    };

    expect(() =>
      safeParseCaseForWorkflowOutput(CaseResponsePropertiesSchema, invalidCasePayload)
    ).not.toThrow();
  });
});

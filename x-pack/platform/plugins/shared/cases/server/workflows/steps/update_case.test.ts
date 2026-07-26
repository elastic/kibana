/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { updateCaseStepDefinition } from './update_case';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.updateCase' });

describe('updateCaseStepDefinition', () => {
  const input = {
    case_id: 'case-1',
    updates: { title: 'Updated title' },
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = updateCaseStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.updateCase');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('fetches version and updates case', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest
      .fn()
      .mockResolvedValue([{ ...createCaseResponseFixture, title: 'Updated title' }]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: createCaseResponseFixture.version,
          title: 'Updated title',
        },
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, title: 'Updated title' },
      },
    });
  });

  it('uses provided version and skips case fetch', async () => {
    const get = jest.fn();
    const bulkUpdate = jest
      .fn()
      .mockResolvedValue([{ ...createCaseResponseFixture, title: 'Updated title' }]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        ...input,
        version: 'provided-version',
      })
    );

    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: 'provided-version',
          title: 'Updated title',
        },
      ],
    });
  });

  it('returns original error when update call throws', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockRejectedValue(new Error('update failed'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result.error).toEqual(expect.objectContaining({ message: 'update failed' }));
  });

  it('normalizes updates for bulk patch requests', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue([createCaseResponseFixture]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        updates: {
          title: 'Updated title',
          assignees: null,
          connector: {
            id: 'webhook-1',
            name: 'Webhook',
            type: '.cases-webhook',
            fields: null,
          },
        },
      })
    );

    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          connector: {
            id: 'webhook-1',
            name: 'Webhook',
            type: '.cases-webhook',
            fields: null,
          },
        }),
      ],
    });
  });

  it('returns original error when case fetch fails', async () => {
    const get = jest.fn().mockRejectedValue(new Error('get failed'));
    const bulkUpdate = jest.fn();
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(bulkUpdate).not.toHaveBeenCalled();
    expect(result.error).toEqual(expect.objectContaining({ message: 'get failed' }));
  });

  it('returns translated error when updated case is missing from response', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue([]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result.error).toEqual(
      expect.objectContaining({
        message: 'Case "case-1" could not be updated.',
      })
    );
  });

  it('pushes case when push-case is enabled', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue([createCaseResponseFixture]);
    const push = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate, push },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    await definition.handler(createContext(input, { 'push-case': true }));

    expect(push).toHaveBeenCalledWith({
      caseId: createCaseResponseFixture.id,
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
  });

  it('returns original error when push fails', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue([createCaseResponseFixture]);
    const push = jest.fn().mockRejectedValue(new Error('push failed'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate, push },
    } as unknown as CasesClient);
    const definition = updateCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input, { 'push-case': true }));

    expect(result.error).toEqual(expect.objectContaining({ message: 'push failed' }));
  });
});

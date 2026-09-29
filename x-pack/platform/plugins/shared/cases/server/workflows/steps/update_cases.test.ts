/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { updateCasesStepDefinition } from './update_cases';
import type { CasesClient } from '../../client';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown, config: Record<string, unknown> = {}) =>
  createStepHandlerContext({ input, config, stepType: 'cases.updateCases' });

describe('updateCasesStepDefinition', () => {
  const input = {
    cases: [
      {
        case_id: 'case-1',
        updates: { title: 'Updated title 1' },
      },
      {
        case_id: 'case-2',
        version: 'version-2',
        updates: { status: 'in-progress' as const },
      },
    ],
  };

  const updatedCases = [
    { ...createCaseResponseFixture, id: 'case-1', title: 'Updated title 1' },
    { ...createCaseResponseFixture, id: 'case-2', status: 'in-progress' },
  ];

  it('creates expected step definition structure', () => {
    const getCasesClient = vi.fn();
    const definition = updateCasesStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.updateCases');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('fetches only missing versions and updates cases', async () => {
    const get = vi.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = vi.fn().mockResolvedValue(updatedCases);
    const getCasesClient = vi.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        {
          id: 'case-1',
          version: createCaseResponseFixture.version,
          title: 'Updated title 1',
        },
        {
          id: 'case-2',
          version: 'version-2',
          status: 'in-progress',
        },
      ],
    });
    expect(result).toEqual({
      output: {
        cases: updatedCases,
      },
    });
  });

  it('passes extended_fields through to bulkUpdate', async () => {
    const get = vi.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = vi.fn().mockResolvedValue([{ ...createCaseResponseFixture, id: 'case-1' }]);
    const getCasesClient = vi.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCasesStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        cases: [
          {
            case_id: 'case-1',
            updates: {
              extended_fields: { priority_as_keyword: 'low' },
            },
          },
        ],
      })
    );

    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          extended_fields: { priority_as_keyword: 'low' },
        }),
      ],
    });
  });

  it('returns translated error when bulk update throws', async () => {
    const get = vi.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = vi.fn().mockRejectedValue(new Error('bulk update failed'));
    const getCasesClient = vi.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error).toEqual(
      expect.objectContaining({
        message: 'Some cases could not be updated: case-1. Reason: bulk update failed',
      })
    );
  });

  it('returns translated error with the actual failing case id when version fetch fails', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(createCaseResponseFixture)
      .mockRejectedValueOnce(new Error('get failed'));
    const bulkUpdate = vi.fn();
    const getCasesClient = vi.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = updateCasesStepDefinition(getCasesClient);

    const inputWithoutSecondVersion = {
      cases: [
        {
          case_id: 'case-1',
          updates: { title: 'Updated title 1' },
        },
        {
          case_id: 'case-2',
          updates: { status: 'in-progress' as const },
        },
      ],
    };

    const result = await definition.handler(createContext(inputWithoutSecondVersion));

    expect(bulkUpdate).not.toHaveBeenCalled();
    expect(result.error).toEqual(
      expect.objectContaining({
        message: 'Some cases could not be updated: case-2. Reason: get failed',
      })
    );
  });

  it('pushes updated cases when push-case is enabled', async () => {
    const get = vi.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = vi.fn().mockResolvedValue(updatedCases);
    const push = vi.fn().mockResolvedValue(undefined);
    const getCasesClient = vi.fn().mockResolvedValue({
      cases: { get, bulkUpdate, push },
    } as unknown as CasesClient);
    const definition = updateCasesStepDefinition(getCasesClient);

    await definition.handler(createContext(input, { 'push-case': true }));

    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenNthCalledWith(1, {
      caseId: 'case-1',
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
    expect(push).toHaveBeenNthCalledWith(2, {
      caseId: 'case-2',
      connectorId: createCaseResponseFixture.connector.id,
      pushType: 'automatic',
    });
  });

  it('returns translated error when one push fails', async () => {
    const get = vi.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = vi.fn().mockResolvedValue(updatedCases);
    const push = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('push failed'));
    const getCasesClient = vi.fn().mockResolvedValue({
      cases: { get, bulkUpdate, push },
    } as unknown as CasesClient);
    const definition = updateCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input, { 'push-case': true }));

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error).toEqual(
      expect.objectContaining({
        message: 'Some cases could not be updated: case-2. Reason: push failed',
      })
    );
  });
});

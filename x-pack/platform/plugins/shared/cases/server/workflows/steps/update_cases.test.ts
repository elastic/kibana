/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    const getCasesClient = jest.fn();
    const definition = updateCasesStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.updateCases');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('fetches only missing versions and updates cases', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue(updatedCases);
    const getCasesClient = jest.fn().mockResolvedValue({
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

  it('returns translated error when bulk update throws', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockRejectedValue(new Error('bulk update failed'));
    const getCasesClient = jest.fn().mockResolvedValue({
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
    const get = jest
      .fn()
      .mockResolvedValueOnce(createCaseResponseFixture)
      .mockRejectedValueOnce(new Error('get failed'));
    const bulkUpdate = jest.fn();
    const getCasesClient = jest.fn().mockResolvedValue({
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
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue(updatedCases);
    const push = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
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
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkUpdate = jest.fn().mockResolvedValue(updatedCases);
    const push = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('push failed'));
    const getCasesClient = jest.fn().mockResolvedValue({
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

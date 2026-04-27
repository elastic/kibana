/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { getCasesStepDefinition } from './get_cases';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.getCases' });

describe('getCasesStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = getCasesStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.getCases');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse({ case_ids: ['case-1', 'case-2'] }).success).toBe(true);
  });

  it('calls cases.bulkGet with correct params and returns cases and errors', async () => {
    const bulkGet = jest.fn().mockResolvedValue({
      cases: [createCaseResponseFixture],
      errors: [],
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { bulkGet },
    } as unknown as CasesClient);
    const definition = getCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_ids: ['case-1', 'case-2'] }));

    expect(bulkGet).toHaveBeenCalledWith({ ids: ['case-1', 'case-2'] });
    expect(result).toEqual({
      output: {
        cases: [createCaseResponseFixture],
        errors: [],
      },
    });
  });

  it('includes errors for unfound case IDs in the output', async () => {
    const bulkGet = jest.fn().mockResolvedValue({
      cases: [createCaseResponseFixture],
      errors: [
        { error: 'Not Found', message: 'case not found', status: 404, caseId: 'case-missing' },
      ],
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { bulkGet },
    } as unknown as CasesClient);
    const definition = getCasesStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_ids: ['case-1', 'case-missing'] })
    );

    expect(result).toEqual({
      output: {
        cases: [createCaseResponseFixture],
        errors: [
          { error: 'Not Found', message: 'case not found', status: 404, caseId: 'case-missing' },
        ],
      },
    });
  });

  it('returns error when cases.bulkGet throws', async () => {
    const bulkGet = jest.fn().mockRejectedValue(new Error('unauthorized'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { bulkGet },
    } as unknown as CasesClient);
    const definition = getCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_ids: ['case-1'] }));

    expect(result).toMatchObject({ error: expect.objectContaining({ message: 'unauthorized' }) });
  });
});

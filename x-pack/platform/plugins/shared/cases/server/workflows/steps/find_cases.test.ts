/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { findCasesStepDefinition } from './find_cases';
import type { CasesClient } from '../../client';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.findCases' });

const findCasesResponseFixture = {
  cases: [createCaseResponseFixture],
  count_closed_cases: 0,
  count_in_progress_cases: 0,
  count_open_cases: 1,
  page: 1,
  per_page: 20,
  total: 1,
};

describe('findCasesStepDefinition', () => {
  const input = {
    owner: 'securitySolution',
    search: 'incident',
    page: 1,
    perPage: 20,
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = findCasesStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.findCases');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('finds cases and returns expected output', async () => {
    const find = jest.fn().mockResolvedValue(findCasesResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { find },
    } as unknown as CasesClient);
    const definition = findCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(find).toHaveBeenCalledWith(input);
    expect(result).toEqual({
      output: findCasesResponseFixture,
    });
  });

  it('returns error when find cases throws', async () => {
    const findError = new Error('find failed');
    const find = jest.fn().mockRejectedValue(findError);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { find },
    } as unknown as CasesClient);
    const definition = findCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result).toEqual({ error: findError });
  });
});

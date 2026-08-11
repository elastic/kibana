/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { findSimilarCasesStepDefinition } from './find_similar_cases';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.findSimilarCases' });

describe('findSimilarCasesStepDefinition', () => {
  it('finds similar cases', async () => {
    const similar = jest.fn().mockResolvedValue({
      cases: [
        {
          ...createCaseResponseFixture,
          similarities: {
            observables: [{ typeKey: 'ip', typeLabel: 'IP', value: '10.0.0.8' }],
          },
        },
      ],
      page: 1,
      per_page: 20,
      total: 1,
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { similar },
    } as unknown as CasesClient);
    const definition = findSimilarCasesStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_id: 'case-1',
        page: 1,
        perPage: 20,
      })
    );

    expect(definition.id).toBe('cases.findSimilarCases');
    expect(similar).toHaveBeenCalledWith('case-1', { page: 1, perPage: 20 });
    expect(result.output).toBeDefined();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { addCategoryStepDefinition } from './add_category';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.addCategory' });

describe('addCategoryStepDefinition', () => {
  it('updates case category', async () => {
    const category = 'Malware';
    const get = jest.fn();
    const bulkUpdate = jest.fn().mockResolvedValue([{ ...createCaseResponseFixture, category }]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = addCategoryStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version', category })
    );

    expect(definition.id).toBe('cases.addCategory');
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          category,
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, category },
      },
    });
  });
});

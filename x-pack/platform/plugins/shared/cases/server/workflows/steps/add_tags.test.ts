/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { addTagsStepDefinition } from './add_tags';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.addTags' });

describe('addTagsStepDefinition', () => {
  it('adds tags to a case', async () => {
    const inputTags = ['triage', 'coke'];
    const mergedTags = ['coke', 'pepsi', 'triage'];
    const currentCase = { ...createCaseResponseFixture, tags: ['coke', 'pepsi'] };
    const get = jest.fn().mockResolvedValue(currentCase);
    const bulkUpdate = jest
      .fn()
      .mockResolvedValue([{ ...createCaseResponseFixture, tags: mergedTags }]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = addTagsStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_id: 'case-1', tags: inputTags }));

    expect(definition.id).toBe('cases.addTags');
    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: currentCase.version,
          tags: mergedTags,
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, tags: mergedTags },
      },
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { setTitleStepDefinition } from './set_title';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.setTitle' });

describe('setTitleStepDefinition', () => {
  it('updates case title', async () => {
    const title = 'Updated title';
    const get = jest.fn();
    const bulkUpdate = jest.fn().mockResolvedValue([{ ...createCaseResponseFixture, title }]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkUpdate },
    } as unknown as CasesClient);
    const definition = setTitleStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version', title })
    );

    expect(definition.id).toBe('cases.setTitle');
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          title,
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, title },
      },
    });
  });
});

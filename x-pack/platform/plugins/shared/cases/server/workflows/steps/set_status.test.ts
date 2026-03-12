/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { setStatusStepDefinition } from './set_status';
import { createBulkUpdateCasesClientMock, createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.setStatus' });

describe('setStatusStepDefinition', () => {
  it('updates case status', async () => {
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock({
      ...createCaseResponseFixture,
      status: 'in-progress',
    });
    const definition = setStatusStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version', status: 'in-progress' })
    );

    expect(definition.id).toBe('cases.setStatus');
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          status: 'in-progress',
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, status: 'in-progress' },
      },
    });
  });
});

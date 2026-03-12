/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { assignCaseStepDefinition } from './assign_case';
import { createBulkUpdateCasesClientMock, createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.assignCase' });

describe('assignCaseStepDefinition', () => {
  it('updates case assignees', async () => {
    const assignees = [{ uid: 'user-1' }];
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock({
      ...createCaseResponseFixture,
      assignees,
    });
    const definition = assignCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version', assignees })
    );

    expect(definition.id).toBe('cases.assignCase');
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          assignees,
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, assignees },
      },
    });
  });
});

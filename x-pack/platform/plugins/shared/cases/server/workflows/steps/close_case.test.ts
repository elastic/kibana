/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { closeCaseStepDefinition } from './close_case';
import { createBulkUpdateCasesClientMock, createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.closeCase' });

describe('closeCaseStepDefinition', () => {
  it('closes case by setting status to closed', async () => {
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock({
      ...createCaseResponseFixture,
      status: 'closed',
    });
    const definition = closeCaseStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version' })
    );

    expect(definition.id).toBe('cases.closeCase');
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          status: 'closed',
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, status: 'closed' },
      },
    });
  });
});

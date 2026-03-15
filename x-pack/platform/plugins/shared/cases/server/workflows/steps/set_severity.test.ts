/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { setSeverityStepDefinition } from './set_severity';
import { createBulkUpdateCasesClientMock, createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.setSeverity' });

describe('setSeverityStepDefinition', () => {
  it('updates case severity', async () => {
    const { get, bulkUpdate, getCasesClient } = createBulkUpdateCasesClientMock({
      ...createCaseResponseFixture,
      severity: 'high',
    });
    const definition = setSeverityStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', version: 'provided-version', severity: 'high' })
    );

    expect(definition.id).toBe('cases.setSeverity');
    expect(get).not.toHaveBeenCalled();
    expect(bulkUpdate).toHaveBeenCalledWith({
      cases: [
        expect.objectContaining({
          id: 'case-1',
          version: 'provided-version',
          severity: 'high',
        }),
      ],
    });
    expect(result).toEqual({
      output: {
        case: { ...createCaseResponseFixture, severity: 'high' },
      },
    });
  });
});

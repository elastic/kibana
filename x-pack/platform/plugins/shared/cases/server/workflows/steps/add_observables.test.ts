/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { addObservablesStepDefinition } from './add_observables';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.addObservables' });

describe('addObservablesStepDefinition', () => {
  it('adds observables to a case', async () => {
    const get = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const bulkAddObservables = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { get, bulkAddObservables },
    } as unknown as CasesClient);
    const definition = addObservablesStepDefinition(getCasesClient);

    await definition.handler(
      createContext({
        case_id: 'case-1',
        observables: [{ typeKey: 'ip', value: '10.0.0.8' }],
      })
    );

    expect(definition.id).toBe('cases.addObservables');
    expect(get).toHaveBeenCalledWith({ id: 'case-1', includeComments: false });
    expect(bulkAddObservables).toHaveBeenCalledWith({
      caseId: 'case-1',
      observables: [{ typeKey: 'ip', value: '10.0.0.8', description: null }],
    });
  });
});

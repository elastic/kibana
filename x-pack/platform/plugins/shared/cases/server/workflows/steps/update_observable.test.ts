/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { updateObservableStepDefinition } from './update_observable';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.updateObservable' });

describe('updateObservableStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = updateObservableStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.updateObservable');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        case_id: 'case-1',
        observable_id: 'obs-1',
        value: '10.0.0.42',
      }).success
    ).toBe(true);
  });

  it('calls cases.updateObservable with correct params and returns updated case', async () => {
    const updateObservable = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { updateObservable },
    } as unknown as CasesClient);
    const definition = updateObservableStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({
        case_id: 'case-1',
        observable_id: 'obs-1',
        value: '10.0.0.42',
        description: 'Updated IP',
      })
    );

    expect(updateObservable).toHaveBeenCalledWith('case-1', 'obs-1', {
      observable: { value: '10.0.0.42', description: 'Updated IP' },
    });
    expect(result).toEqual({
      output: { case: createCaseResponseFixture },
    });
  });

  it('passes null description when description is not provided', async () => {
    const updateObservable = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { updateObservable },
    } as unknown as CasesClient);
    const definition = updateObservableStepDefinition(getCasesClient);

    await definition.handler(
      createContext({ case_id: 'case-1', observable_id: 'obs-1', value: '10.0.0.42' })
    );

    expect(updateObservable).toHaveBeenCalledWith('case-1', 'obs-1', {
      observable: { value: '10.0.0.42', description: null },
    });
  });

  it('returns error when cases.updateObservable throws', async () => {
    // FAILURE SCENARIO: client throws (e.g. observable not found or platinum license missing)
    const updateObservable = jest.fn().mockRejectedValue(new Error('observable not found'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { updateObservable },
    } as unknown as CasesClient);
    const definition = updateObservableStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', observable_id: 'obs-1', value: '10.0.0.42' })
    );

    expect(result).toEqual({ error: new Error('observable not found') });
  });
});

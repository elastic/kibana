/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '../../client';
import { deleteObservableStepDefinition } from './delete_observable';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.deleteObservable' });

describe('deleteObservableStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = deleteObservableStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.deleteObservable');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        case_id: 'case-1',
        observable_id: 'obs-1',
      }).success
    ).toBe(true);
  });

  it('calls cases.deleteObservable with correct params and echoes identifiers', async () => {
    const deleteObservable = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { deleteObservable },
    } as unknown as CasesClient);
    const definition = deleteObservableStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ case_id: 'case-1', observable_id: 'obs-1' })
    );

    expect(deleteObservable).toHaveBeenCalledWith('case-1', 'obs-1');
    expect(result).toEqual({
      output: { case_id: 'case-1', observable_id: 'obs-1' },
    });
  });

  it('returns error when cases.deleteObservable throws', async () => {
    // FAILURE SCENARIO: client throws (e.g. observable not found or auth failure)
    const deleteObservable = jest.fn().mockRejectedValue(new Error('observable not found'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { deleteObservable },
    } as unknown as CasesClient);
    const definition = deleteObservableStepDefinition(getCasesClient);

    await expect(
      definition.handler(createContext({ case_id: 'case-1', observable_id: 'obs-1' }))
    ).rejects.toThrow('observable not found');
  });
});

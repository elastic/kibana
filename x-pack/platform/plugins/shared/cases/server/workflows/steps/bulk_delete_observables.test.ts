/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OBSERVABLES_PER_CASE } from '../../../common/constants';
import type { CasesClient } from '../../client';
import { bulkDeleteObservablesStepDefinition } from './bulk_delete_observables';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.bulkDeleteObservables' });

const validInput = {
  case_id: 'case-1',
  observable_ids: ['obs-1', 'obs-2'],
};

describe('bulkDeleteObservablesStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = bulkDeleteObservablesStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.bulkDeleteObservables');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects an empty observable_ids array', () => {
    const definition = bulkDeleteObservablesStepDefinition(jest.fn());

    expect(
      definition.inputSchema.safeParse({ case_id: 'case-1', observable_ids: [] }).success
    ).toBe(false);
  });

  it('rejects blank observable_ids values', () => {
    const definition = bulkDeleteObservablesStepDefinition(jest.fn());

    expect(
      definition.inputSchema.safeParse({ case_id: 'case-1', observable_ids: [''] }).success
    ).toBe(false);
  });

  it('rejects an observable_ids array longer than MAX_OBSERVABLES_PER_CASE', () => {
    const definition = bulkDeleteObservablesStepDefinition(jest.fn());

    expect(
      definition.inputSchema.safeParse({
        case_id: 'case-1',
        observable_ids: new Array(MAX_OBSERVABLES_PER_CASE + 1).fill('obs-id'),
      }).success
    ).toBe(false);
  });

  it('calls cases.bulkDeleteObservables with correct params and echoes identifiers', async () => {
    const bulkDeleteObservables = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { bulkDeleteObservables },
    } as unknown as CasesClient);
    const definition = bulkDeleteObservablesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(validInput));

    expect(bulkDeleteObservables).toHaveBeenCalledWith({
      caseId: 'case-1',
      observableIds: ['obs-1', 'obs-2'],
    });
    expect(result).toEqual({
      output: { case_id: 'case-1', observable_ids: ['obs-1', 'obs-2'] },
    });
  });

  it('returns error when cases.bulkDeleteObservables throws', async () => {
    const bulkDeleteObservables = jest.fn().mockRejectedValue(new Error('observable not found'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { bulkDeleteObservables },
    } as unknown as CasesClient);
    const definition = bulkDeleteObservablesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(validInput));

    expect(result.error).toEqual(
      expect.objectContaining({
        message:
          'Observables could not be deleted on case "case-1": obs-1, obs-2. Reason: observable not found',
      })
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteCasesStepDefinition } from './delete_cases';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.deleteCases' });

describe('deleteCasesStepDefinition', () => {
  const input = {
    case_ids: ['case-1', 'case-2'],
  };

  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = deleteCasesStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.deleteCases');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse(input).success).toBe(true);
  });

  it('deletes all cases and returns deleted ids', async () => {
    const deleteCases = jest.fn().mockResolvedValue(undefined);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { delete: deleteCases },
    } as unknown as CasesClient);
    const definition = deleteCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(deleteCases).toHaveBeenCalledWith(['case-1', 'case-2']);
    expect(result).toEqual({
      output: {
        case_ids: ['case-1', 'case-2'],
      },
    });
  });

  it('returns translated error when delete fails', async () => {
    const deleteCases = jest.fn().mockRejectedValue(new Error('delete failed'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { delete: deleteCases },
    } as unknown as CasesClient);
    const definition = deleteCasesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext(input));

    expect(result.error).toEqual(
      expect.objectContaining({
        message: 'Cases could not be deleted: case-1, case-2. Reason: delete failed',
      })
    );
  });
});

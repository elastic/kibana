/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { extractObservablesStepDefinition } from './extract_observables';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.extractObservables' });

describe('extractObservablesStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const definition = extractObservablesStepDefinition(jest.fn());

    expect(definition.id).toBe('cases.extractObservables');
    expect(typeof definition.handler).toBe('function');
    expect(definition.inputSchema.safeParse({ case_id: 'case-1' }).success).toBe(true);
  });

  it('rejects a missing or empty case_id', () => {
    const definition = extractObservablesStepDefinition(jest.fn());

    expect(definition.inputSchema.safeParse({}).success).toBe(false);
    expect(definition.inputSchema.safeParse({ case_id: '' }).success).toBe(false);
  });

  it('calls cases.extractObservables and maps the result to the step output', async () => {
    const extractObservables = jest.fn().mockResolvedValue({
      case: createCaseResponseFixture,
      status: 'extracted',
      newObservablesCount: 2,
      alertsRequested: 3,
      alertsFound: 2,
    });
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { extractObservables },
    } as unknown as CasesClient);
    const definition = extractObservablesStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_id: 'case-1' }));

    expect(extractObservables).toHaveBeenCalledWith('case-1');
    expect(result).toEqual({
      output: {
        case: expect.objectContaining({ id: createCaseResponseFixture.id }),
        status: 'extracted',
        new_observables_count: 2,
        alerts_requested: 3,
        alerts_found: 2,
      },
    });
  });

  it('returns an output, not an error, when no new observables were found', async () => {
    const extractObservables = jest.fn().mockResolvedValue({
      case: createCaseResponseFixture,
      status: 'no_new_observables',
      newObservablesCount: 0,
      alertsRequested: 1,
      alertsFound: 1,
    });
    const definition = extractObservablesStepDefinition(
      jest.fn().mockResolvedValue({ cases: { extractObservables } } as unknown as CasesClient)
    );

    const result = await definition.handler(createContext({ case_id: 'case-1' }));

    expect(result.error).toBeUndefined();
    expect(result.output).toEqual(
      expect.objectContaining({ status: 'no_new_observables', new_observables_count: 0 })
    );
  });

  it('returns an error that names the case when the extraction fails', async () => {
    const extractObservables = jest
      .fn()
      .mockRejectedValue(new Error('Observable extraction is turned off for this case'));
    const definition = extractObservablesStepDefinition(
      jest.fn().mockResolvedValue({ cases: { extractObservables } } as unknown as CasesClient)
    );

    const result = await definition.handler(createContext({ case_id: 'case-1' }));

    expect(result.output).toBeUndefined();
    expect(result.error?.message).toContain('case-1');
    expect(result.error?.message).toContain('turned off');
  });
});

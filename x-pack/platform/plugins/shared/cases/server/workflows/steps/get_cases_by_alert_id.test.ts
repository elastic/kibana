/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '../../client';
import { getCasesByAlertIdStepDefinition } from './get_cases_by_alert_id';
import { createStepHandlerContext } from './test_utils';

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.getCasesByAlertId' });

const relatedCaseFixture = {
  id: 'case-1',
  title: 'Incident case',
  description: 'Desc',
  status: 'open',
  createdAt: '2020-02-19T23:06:33.798Z',
  totals: { alerts: 1, events: 0, userComments: 0 },
};

describe('getCasesByAlertIdStepDefinition', () => {
  it('creates expected step definition structure', () => {
    const getCasesClient = jest.fn();
    const definition = getCasesByAlertIdStepDefinition(getCasesClient);

    expect(definition.id).toBe('cases.getCasesByAlertId');
    expect(typeof definition.handler).toBe('function');
    expect(
      definition.inputSchema.safeParse({
        alert_id: 'alert-1',
      }).success
    ).toBe(true);
  });

  it('calls getCasesByAlertID with correct params and returns cases', async () => {
    const getCasesByAlertID = jest.fn().mockResolvedValue([relatedCaseFixture]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { getCasesByAlertID },
    } as unknown as CasesClient);
    const definition = getCasesByAlertIdStepDefinition(getCasesClient);

    const result = await definition.handler(
      createContext({ alert_id: 'alert-1', owner: 'securitySolution' })
    );

    expect(getCasesByAlertID).toHaveBeenCalledWith({
      alertID: 'alert-1',
      options: { owner: 'securitySolution' },
    });
    expect(result).toEqual({
      output: { cases: [relatedCaseFixture] },
    });
  });

  it('calls getCasesByAlertID without owner when not provided', async () => {
    const getCasesByAlertID = jest.fn().mockResolvedValue([]);
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { getCasesByAlertID },
    } as unknown as CasesClient);
    const definition = getCasesByAlertIdStepDefinition(getCasesClient);

    await definition.handler(createContext({ alert_id: 'alert-1' }));

    expect(getCasesByAlertID).toHaveBeenCalledWith({
      alertID: 'alert-1',
      options: { owner: undefined },
    });
  });

  it('returns error when getCasesByAlertID throws', async () => {
    // FAILURE SCENARIO: client throws (e.g. authorization failure or network error)
    const getCasesByAlertID = jest.fn().mockRejectedValue(new Error('unauthorized'));
    const getCasesClient = jest.fn().mockResolvedValue({
      cases: { getCasesByAlertID },
    } as unknown as CasesClient);
    const definition = getCasesByAlertIdStepDefinition(getCasesClient);

    await expect(definition.handler(createContext({ alert_id: 'alert-1' }))).rejects.toThrow();
  });
});

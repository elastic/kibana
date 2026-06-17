/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import { pushCasesStepDefinition } from './push_cases';
import { createStepHandlerContext } from './test_utils';
import type { CasesClient } from '../../client';

const caseWithConnector = {
  ...createCaseResponseFixture,
  connector: { id: 'connector-1', name: 'My Connector', type: '.jira', fields: null },
};

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.pushCases' });

const makeCasesClient = (overrides: Partial<{ get: jest.Mock; push: jest.Mock }> = {}) => {
  const get = overrides.get ?? jest.fn().mockResolvedValue(caseWithConnector);
  const push = overrides.push ?? jest.fn().mockResolvedValue(createCaseResponseFixture);
  return jest.fn().mockResolvedValue({ cases: { get, push } } as unknown as CasesClient);
};

describe('pushCasesStepDefinition', () => {
  it('pushes a single case when case_ids contains one id', async () => {
    const push = jest.fn().mockResolvedValue(createCaseResponseFixture);
    const definition = pushCasesStepDefinition(makeCasesClient({ push }));

    const result = await definition.handler(createContext({ case_ids: ['case-1'] }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({
      caseId: 'case-1',
      connectorId: 'connector-1',
      pushType: 'automatic',
    });
    expect(result).toEqual({ output: { cases: [createCaseResponseFixture] } });
  });

  it('pushes all cases in parallel when case_ids contains multiple ids', async () => {
    const pushedCase1 = { ...createCaseResponseFixture, id: 'case-1' };
    const pushedCase2 = { ...createCaseResponseFixture, id: 'case-2' };
    const get = jest.fn().mockResolvedValue(caseWithConnector);
    const push = jest.fn().mockResolvedValueOnce(pushedCase1).mockResolvedValueOnce(pushedCase2);
    const definition = pushCasesStepDefinition(makeCasesClient({ get, push }));

    const result = await definition.handler(createContext({ case_ids: ['case-1', 'case-2'] }));

    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith({
      caseId: 'case-1',
      connectorId: 'connector-1',
      pushType: 'automatic',
    });
    expect(push).toHaveBeenCalledWith({
      caseId: 'case-2',
      connectorId: 'connector-1',
      pushType: 'automatic',
    });
    expect(result).toEqual({ output: { cases: [pushedCase1, pushedCase2] } });
  });

  it('returns error when push throws', async () => {
    const pushError = new Error('push failed');
    const definition = pushCasesStepDefinition(
      makeCasesClient({ push: jest.fn().mockRejectedValue(pushError) })
    );

    const result = await definition.handler(createContext({ case_ids: ['case-1'] }));

    expect(result).toEqual({ error: pushError });
  });
});

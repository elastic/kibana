/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCaseResponseFixture } from '../../../common/fixtures/create_case';
import type { CasesClient } from '../../client';
import { syncCaseStepDefinition } from './sync_case';
import { createStepHandlerContext } from './test_utils';

const syncedCase = { ...createCaseResponseFixture, title: 'Renamed in Jira' };

const createContext = (input: unknown) =>
  createStepHandlerContext({ input, stepType: 'cases.syncCase' });

const makeCasesClient = (
  overrides: Partial<{ sync: jest.Mock; findByExternalId: jest.Mock }> = {}
) => {
  const sync = overrides.sync ?? jest.fn().mockResolvedValue(syncedCase);
  const findByExternalId =
    overrides.findByExternalId ?? jest.fn().mockResolvedValue([createCaseResponseFixture]);
  const getCasesClient = jest
    .fn()
    .mockResolvedValue({ cases: { sync, findByExternalId } } as unknown as CasesClient);
  return { sync, findByExternalId, getCasesClient };
};

describe('syncCaseStepDefinition', () => {
  it('syncs the case by id', async () => {
    const { sync, findByExternalId, getCasesClient } = makeCasesClient();
    const definition = syncCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_id: 'case-1' }));

    expect(findByExternalId).not.toHaveBeenCalled();
    expect(sync).toHaveBeenCalledWith({ caseId: 'case-1' });
    expect(result).toMatchObject({
      output: { cases: [expect.objectContaining({ title: 'Renamed in Jira' })] },
    });
  });

  it('resolves the case from the external incident id and connector', async () => {
    const { sync, findByExternalId, getCasesClient } = makeCasesClient();
    const definition = syncCaseStepDefinition(getCasesClient);

    await definition.handler(createContext({ external_id: '10001', connector_id: 'jira-1' }));

    expect(findByExternalId).toHaveBeenCalledWith({ externalId: '10001', connectorId: 'jira-1' });
    expect(sync).toHaveBeenCalledWith({ caseId: createCaseResponseFixture.id });
  });

  it('returns an empty list and warns when no case matches the external id', async () => {
    const { sync, getCasesClient } = makeCasesClient({
      findByExternalId: jest.fn().mockResolvedValue([]),
    });
    const definition = syncCaseStepDefinition(getCasesClient);
    const context = createContext({ external_id: 'missing' });

    const result = await definition.handler(context);

    expect(sync).not.toHaveBeenCalled();
    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No case found for external id missing')
    );
    expect(result).toMatchObject({ output: { cases: [] } });
  });

  it('returns null for a case whose sync failed and logs the error', async () => {
    const { getCasesClient } = makeCasesClient({
      sync: jest.fn().mockRejectedValue(new Error('incident unreachable')),
    });
    const definition = syncCaseStepDefinition(getCasesClient);
    const context = createContext({ case_id: 'case-1' });

    const result = await definition.handler(context);

    expect(context.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('incident unreachable')
    );
    expect(result).toMatchObject({ output: { cases: [null] } });
  });

  it('returns { error } when the cases client cannot be obtained', async () => {
    const getCasesClient = jest.fn().mockRejectedValue(new Error('no client'));
    const definition = syncCaseStepDefinition(getCasesClient);

    const result = await definition.handler(createContext({ case_id: 'case-1' }));

    expect(result).toEqual({ error: expect.objectContaining({ message: 'no client' }) });
  });
});

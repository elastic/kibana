/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toElasticsearchQuery } from '@kbn/es-query';
import { mockCases } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { findByExternalId } from './find_by_external_id';

describe('findByExternalId', () => {
  const clientArgs = createCasesClientMockArgs();
  const { caseService } = clientArgs.services;
  const ensureSavedObjectsAreAuthorized = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clientArgs.authorization.getAuthorizationFilter.mockResolvedValue({
      filter: undefined,
      ensureSavedObjectsAreAuthorized,
      authorizedOwners: ['securitySolution'],
    } as never);
    caseService.findCases.mockResolvedValue({
      saved_objects: [{ ...mockCases[0], score: 1 }],
      total: 1,
      page: 1,
      per_page: 100,
    } as never);
  });

  it('filters on the external incident id and the connector', async () => {
    await findByExternalId({ externalId: '10001', connectorId: 'jira-1' }, clientArgs);

    const { filter } = caseService.findCases.mock.calls[0][0] ?? {};
    const query = JSON.stringify(toElasticsearchQuery(filter!));
    expect(query).toContain('cases.attributes.external_service.external_id');
    expect(query).toContain('10001');
    expect(query).toContain('cases.attributes.external_service.connector_id');
    expect(query).toContain('jira-1');
  });

  it('does not filter on the connector when none is given', async () => {
    await findByExternalId({ externalId: '10001' }, clientArgs);

    const { filter } = caseService.findCases.mock.calls[0][0] ?? {};
    expect(JSON.stringify(toElasticsearchQuery(filter!))).not.toContain(
      'external_service.connector_id'
    );
  });

  it('checks authorization on the returned cases and flattens them', async () => {
    const res = await findByExternalId({ externalId: '10001' }, clientArgs);

    expect(clientArgs.authorization.getAuthorizationFilter).toHaveBeenCalled();
    expect(ensureSavedObjectsAreAuthorized).toHaveBeenCalledWith([
      { id: mockCases[0].id, owner: mockCases[0].attributes.owner },
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe(mockCases[0].id);
  });

  it('wraps lookup failures', async () => {
    caseService.findCases.mockRejectedValue(new Error('boom'));

    await expect(findByExternalId({ externalId: '10001' }, clientArgs)).rejects.toThrow(
      'Failed to find cases for external id 10001: Error: boom'
    );
  });
});

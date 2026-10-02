/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMockArgs } from '../mocks';
import { getConnectorSyncSettings } from './get_connector_sync_settings';

describe('getConnectorSyncSettings', () => {
  const clientArgs = createCasesClientMockArgs();
  const { connectorMappingsService } = clientArgs.services;

  const found = (attributes?: Record<string, unknown>) =>
    ({
      saved_objects: attributes != null ? [{ id: 'mapping-1', attributes }] : [],
      total: attributes != null ? 1 : 0,
      page: 1,
      per_page: 1,
    } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks up the mappings referencing the connector', async () => {
    connectorMappingsService.find.mockResolvedValue(found());

    await getConnectorSyncSettings({ connectorId: 'jira-1' }, clientArgs);

    expect(connectorMappingsService.find).toHaveBeenCalledWith({
      unsecuredSavedObjectsClient: clientArgs.unsecuredSavedObjectsClient,
      options: { perPage: 1, hasReference: { type: 'action', id: 'jira-1' } },
    });
  });

  it('returns only the sync settings that are saved', async () => {
    connectorMappingsService.find.mockResolvedValue(
      found({
        mappings: [],
        owner: 'cases',
        externalSyncFields: [{ field: 'title', direction: 'pull' }],
      })
    );

    expect(await getConnectorSyncSettings({ connectorId: 'jira-1' }, clientArgs)).toEqual({
      externalSyncFields: [{ field: 'title', direction: 'pull' }],
    });
  });

  it('returns every saved sync setting, including the field mappings', async () => {
    const externalSync = { autoPush: true, conflictStrategy: 'kibana' };
    const externalSyncFieldMappings = [
      { externalField: 'priority', caseField: 'severity_tier_as_keyword', direction: 'both' },
    ];
    connectorMappingsService.find.mockResolvedValue(
      found({ mappings: [], owner: 'cases', externalSync, externalSyncFieldMappings })
    );

    expect(await getConnectorSyncSettings({ connectorId: 'jira-1' }, clientArgs)).toEqual({
      externalSync,
      externalSyncFieldMappings,
    });
  });

  it('returns an empty object when the connector was never configured', async () => {
    connectorMappingsService.find.mockResolvedValue(found());

    expect(await getConnectorSyncSettings({ connectorId: 'jira-1' }, clientArgs)).toEqual({});
  });

  it('wraps lookup failures', async () => {
    connectorMappingsService.find.mockRejectedValue(new Error('boom'));

    await expect(getConnectorSyncSettings({ connectorId: 'jira-1' }, clientArgs)).rejects.toThrow(
      'Failed to retrieve sync settings for connector id: jira-1: Error: boom'
    );
  });
});

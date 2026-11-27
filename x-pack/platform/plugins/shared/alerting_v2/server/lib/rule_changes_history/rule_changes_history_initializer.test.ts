/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import type { ChangeHistoryClient } from '@kbn/change-history';
import { RuleChangesHistoryInitializer } from './rule_changes_history_initializer';

describe('RuleChangesHistoryInitializer', () => {
  const createClientMock = () =>
    ({ initialize: jest.fn().mockResolvedValue(undefined) }) as unknown as jest.Mocked<
      Pick<ChangeHistoryClient, 'initialize'>
    >;

  it('initializes the change history client with the ES client and user profile service', async () => {
    const client = createClientMock();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const userProfileService = userProfileServiceMock.createStart();
    const initializer = new RuleChangesHistoryInitializer(
      client as unknown as ChangeHistoryClient,
      esClient,
      userProfileService
    );

    await initializer.initialize();

    expect(client.initialize).toHaveBeenCalledTimes(1);
    expect(client.initialize).toHaveBeenCalledWith(esClient, { userProfileService });
  });
});

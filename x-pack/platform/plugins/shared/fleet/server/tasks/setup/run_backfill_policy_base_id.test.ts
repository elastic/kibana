/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { appContextService } from '../../services';
import { backfillPolicyBaseId } from '../../services/backfill_policy_base_id';

import { runBackfillPolicyBaseId } from './run_backfill_policy_base_id';

jest.mock('../../services/backfill_policy_base_id');

describe('runBackfillPolicyBaseId', () => {
  it('backfills with the internal user client, the task signal and logger', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    jest.spyOn(appContextService, 'getInternalUserESClient').mockReturnValue(esClient);
    const logger = loggingSystemMock.createLogger();
    const { signal } = new AbortController();

    await runBackfillPolicyBaseId({ signal, logger });

    expect(backfillPolicyBaseId).toHaveBeenCalledWith(esClient, { signal, logger });
  });
});

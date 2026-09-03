/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { MlClient } from '../../lib/ml_client/types';
import type { MLSavedObjectService } from '../../saved_objects';
import { DEFAULT_ML_PROJECT_ROUTING } from '../../../common/constants/cps';
import { jobAuditMessagesProvider } from './job_audit_messages';

const JOB_ID = 'test-job';
const NOTIFICATION_INDEX = '.ml-notifications-000002';

const cpsServerless = { isServerless: true, cpsEnabled: true };

const createMlClient = (): MlClient => {
  const mlClient: Pick<MlClient, 'getJobs'> = {
    getJobs: jest.fn().mockResolvedValue({ count: 1, jobs: [{ job_id: JOB_ID }] }),
  };
  return mlClient as MlClient;
};

describe('jobAuditMessagesProvider - clearJobAuditMessages', () => {
  const setup = () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();

    client.asInternalUser.updateByQuery.mockResponse({});
    client.asInternalUser.index.mockResponse({
      _id: '1',
      _index: NOTIFICATION_INDEX,
      _primary_term: 1,
      _seq_no: 1,
      _shards: { failed: 0, successful: 1, total: 1 },
      _version: 1,
      result: 'created',
    });

    const { clearJobAuditMessages } = jobAuditMessagesProvider(
      client,
      createMlClient(),
      cpsServerless
    );

    return { client, clearJobAuditMessages };
  };

  it('does not send project_routing to update_by_query when CPS is enabled', async () => {
    const { client, clearJobAuditMessages } = setup();

    await clearJobAuditMessages(JOB_ID, [NOTIFICATION_INDEX]);

    expect(client.asInternalUser.updateByQuery).toHaveBeenCalledTimes(1);
    expect(client.asInternalUser.updateByQuery.mock.calls[0][0]).not.toHaveProperty(
      'project_routing'
    );
  });

  it('does not send project_routing to index or add it to the cleared message', async () => {
    const { client, clearJobAuditMessages } = setup();

    await clearJobAuditMessages(JOB_ID, [NOTIFICATION_INDEX]);

    expect(client.asInternalUser.index).toHaveBeenCalledTimes(1);

    const params = client.asInternalUser.index.mock.calls[0][0];
    expect(params).not.toHaveProperty('project_routing');
    expect(params.body).not.toHaveProperty('project_routing');
  });
});

describe('jobAuditMessagesProvider - getJobAuditMessages', () => {
  it('sends project_routing to search when CPS is enabled', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asInternalUser.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: { failed: 0, successful: 1, total: 1 },
      hits: { hits: [], total: { value: 0, relation: 'eq' } },
    });

    const mlSavedObjectService: Pick<MLSavedObjectService, 'filterJobsForSpace'> = {
      filterJobsForSpace: jest.fn().mockResolvedValue([]),
    };

    const { getJobAuditMessages } = jobAuditMessagesProvider(
      client,
      createMlClient(),
      cpsServerless
    );

    await getJobAuditMessages(mlSavedObjectService as MLSavedObjectService, { jobId: JOB_ID });

    expect(client.asInternalUser.search.mock.calls[0][0]).toHaveProperty(
      'project_routing',
      DEFAULT_ML_PROJECT_ROUTING
    );
  });
});

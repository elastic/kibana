/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { NewPackagePolicy } from '../../types';
import { appContextService } from '../app_context';
import { setLogsdbColumnarChoice } from '../epm/packages/update_logsdb_columnar';

import { handleLogsdbColumnarChoice } from './logsdb_columnar_choice';

jest.mock('../app_context');
jest.mock('../epm/packages/update_logsdb_columnar', () => ({
  setLogsdbColumnarChoice: jest.fn(),
}));

describe('handleLogsdbColumnarChoice', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const logger = loggerMock.create();

  const policy = (pkg?: NewPackagePolicy['package']): NewPackagePolicy => ({
    name: 'nginx-1',
    namespace: 'default',
    enabled: true,
    policy_ids: ['agent-policy'],
    inputs: [],
    package: pkg,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(appContextService.getLogger).mockReturnValue(logger);
  });

  it('does nothing when the policy carries no choice', async () => {
    await handleLogsdbColumnarChoice({
      soClient,
      esClient,
      packagePolicy: policy({ name: 'nginx', title: 'Nginx', version: '1.0.0' }),
    });
    await handleLogsdbColumnarChoice({ soClient, esClient, packagePolicy: policy(undefined) });

    expect(setLogsdbColumnarChoice).not.toHaveBeenCalled();
  });

  it.each([true, false])('hands the choice (%s) to the shared path', async (enabled) => {
    await handleLogsdbColumnarChoice({
      soClient,
      esClient,
      packagePolicy: policy({
        name: 'nginx',
        title: 'Nginx',
        version: '1.0.0',
        logsdb_columnar: enabled,
      }),
    });

    expect(setLogsdbColumnarChoice).toHaveBeenCalledWith({
      savedObjectsClient: soClient,
      esClient,
      logger,
      pkgName: 'nginx',
      enabled,
    });
  });
});

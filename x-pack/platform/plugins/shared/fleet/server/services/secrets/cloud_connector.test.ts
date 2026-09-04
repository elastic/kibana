/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import type { NewPackagePolicy, PackageInfo } from '../../../common/types';
import { CloudConnectorInvalidVarsError } from '../../errors';

import { extractAndCreateCloudConnectorSecrets } from './cloud_connector';
import { createSecrets } from './common';

jest.mock('./common', () => ({
  createSecrets: jest.fn(),
}));

const mockCreateSecrets = createSecrets as jest.MockedFunction<typeof createSecrets>;

describe('extractAndCreateCloudConnectorSecrets', () => {
  let esClient: ElasticsearchClient;
  let logger: Logger;

  // Package with input-level credential vars (no package-level credential vars)
  const packageInfo = { vars: [] } as unknown as PackageInfo;

  const buildAwsPackagePolicy = (
    vars: Record<string, { value: unknown; type?: string }>
  ): NewPackagePolicy =>
    ({
      name: 'aws-1',
      namespace: 'default',
      enabled: true,
      policy_ids: [],
      supports_cloud_connector: true,
      inputs: [
        {
          type: 'aws/metrics',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { type: 'metrics', dataset: 'aws.ec2_metrics' },
              vars,
            },
          ],
        },
      ],
    } as unknown as NewPackagePolicy);

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = {} as ElasticsearchClient;
    logger = loggingSystemMock.createLogger();
  });

  describe('AWS', () => {
    it('should return role_arn only when external_id is absent (identity federation without external ID)', async () => {
      const packagePolicy = buildAwsPackagePolicy({
        role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
      });

      const result = await extractAndCreateCloudConnectorSecrets(
        'aws',
        packagePolicy,
        packageInfo,
        esClient,
        logger
      );

      expect(result).toEqual({
        role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/TestRole' },
      });
      expect(mockCreateSecrets).not.toHaveBeenCalled();
    });

    it('should create a secret for external_id when it is present as a plain value', async () => {
      mockCreateSecrets.mockResolvedValue([{ id: 'secret-id-1' } as any]);

      const packagePolicy = buildAwsPackagePolicy({
        role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole', type: 'text' },
        external_id: { value: 'plain-external-id-1234', type: 'password' },
      });

      const result = await extractAndCreateCloudConnectorSecrets(
        'aws',
        packagePolicy,
        packageInfo,
        esClient,
        logger
      );

      expect(mockCreateSecrets).toHaveBeenCalledWith({
        esClient,
        values: ['plain-external-id-1234'],
      });
      expect(result).toEqual({
        role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/TestRole' },
        external_id: { type: 'password', value: { id: 'secret-id-1', isSecretRef: true } },
      });
    });

    it('should throw when role_arn is missing', async () => {
      const packagePolicy = buildAwsPackagePolicy({
        external_id: { value: 'plain-external-id-1234', type: 'password' },
      });

      await expect(
        extractAndCreateCloudConnectorSecrets('aws', packagePolicy, packageInfo, esClient, logger)
      ).rejects.toThrow(CloudConnectorInvalidVarsError);
    });
  });
});

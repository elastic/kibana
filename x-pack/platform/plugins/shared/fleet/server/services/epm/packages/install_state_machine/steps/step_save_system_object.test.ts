/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  savedObjectsClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { FLEET_INSTALL_FORMAT_VERSION } from '../../../../../constants';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common/constants';
import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { auditLoggingService } from '../../../../audit_logging';
import { packagePolicyService } from '../../../../package_policy';
import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';

import { stepSaveSystemObject } from './step_save_system_object';

jest.mock('../../../../audit_logging');
const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

jest.mock('../../../../package_policy');
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;

describe('updateLatestExecutedState', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const logger = loggingSystemMock.createLogger();

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });

  afterEach(() => {
    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();
    soClient.get.mockReset();
    soClient.update.mockReset();
  });

  it('Should save the SO and should not call packagePolicy upgrade if keep_policies_up_to_date = false', async () => {
    soClient.get.mockResolvedValue({
      id: 'test-integration',
      attributes: {
        title: 'title',
        name: 'test-integration',
        version: '1.0.0',
        install_source: 'registry',
        install_status: 'installed',
        package_assets: [],
      },
    } as any);

    await stepSaveSystemObject({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
      packageInstallContext: {
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
        packageInfo: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
          description: 'test',
          type: 'integration',
          categories: ['cloud', 'custom'],
          format_version: 'string',
          release: 'experimental',
          conditions: { kibana: { version: 'x.y.z' } },
          owner: { github: 'elastic/fleet' },
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(soClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'test-integration',
        {
          install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
          install_status: 'installed',
          install_version: '1.0.0',
          latest_install_failed_attempts: [],
          package_assets: undefined,
          rolled_back: false,
          version: '1.0.0',
        },
      ],
      ['epm-packages', 'test-integration', { es_index_patterns: {} }, { version: undefined }],
    ]);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'update',
      name: 'test-integration',
      id: 'test-integration',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
    expect(mockedPackagePolicyService.bulkUpgrade).not.toHaveBeenCalled();
  });

  it('Should call packagePolicy upgrade if keep_policies_up_to_date = true', async () => {
    soClient.get.mockResolvedValue({
      id: 'test-integration',
      attributes: {
        title: 'title',
        name: 'test-integration',
        version: '1.0.0',
        install_source: 'registry',
        install_status: 'installed',
        package_assets: [],
        keep_policies_up_to_date: true,
      },
    } as any);
    mockedPackagePolicyService.listIds.mockReturnValue({
      items: ['packagePolicy1', 'packagePolicy2'],
    } as any);

    await stepSaveSystemObject({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
      packageInstallContext: {
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
        packageInfo: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
          description: 'test',
          type: 'integration',
          categories: ['cloud', 'custom'],
          format_version: 'string',
          release: 'experimental',
          conditions: { kibana: { version: 'x.y.z' } },
          owner: { github: 'elastic/fleet' },
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(soClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'test-integration',
        {
          install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
          install_status: 'installed',
          install_version: '1.0.0',
          latest_install_failed_attempts: [],
          package_assets: undefined,
          rolled_back: false,
          version: '1.0.0',
        },
      ],
      ['epm-packages', 'test-integration', { es_index_patterns: {} }, { version: undefined }],
    ]);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'update',
      id: 'test-integration',
      name: 'test-integration',
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
    expect(packagePolicyService.bulkUpgrade).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      ['packagePolicy1', 'packagePolicy2']
    );
  });

  it('Should save the SO with rolled_back:true if update version is less than current version', async () => {
    soClient.get.mockResolvedValue({
      id: 'test-integration',
      attributes: {
        title: 'title',
        name: 'test-integration',
        version: '1.0.1',
        install_source: 'registry',
        install_status: 'installed',
        package_assets: [],
      },
    } as any);

    await stepSaveSystemObject({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger,
      packageInstallContext: {
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
        packageInfo: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
          description: 'test',
          type: 'integration',
          categories: ['cloud', 'custom'],
          format_version: 'string',
          release: 'experimental',
          conditions: { kibana: { version: 'x.y.z' } },
          owner: { github: 'elastic/fleet' },
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      installedPkg: {
        attributes: {
          name: 'test-integration',
          version: '1.0.1',
          install_source: 'registry',
          install_status: 'installed',
          package_assets: [],
        },
        id: 'test-integration',
      } as any,
    });

    expect(soClient.update.mock.calls).toEqual([
      [
        'epm-packages',
        'test-integration',
        {
          install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
          install_status: 'installed',
          install_version: '1.0.0',
          latest_install_failed_attempts: [],
          package_assets: undefined,
          rolled_back: true,
          version: '1.0.0',
        },
      ],
      ['epm-packages', 'test-integration', { es_index_patterns: {} }, { version: undefined }],
    ]);
  });

  describe('es_index_patterns recompute', () => {
    const baseArgs = {
      installType: 'install' as const,
      installSource: 'registry' as const,
      spaceId: DEFAULT_SPACE_ID,
    };

    beforeEach(() => {
      appContextService.start(
        createAppContextStartContractMock({}, undefined, undefined, {
          enableOtelIntegrations: true,
        } as any)
      );
    });

    it('produces an .otel pattern for an OTel data stream in the package manifest', async () => {
      soClient.get.mockResolvedValue({
        id: 'supabase',
        version: 'WzEsMV0=',
        attributes: {
          title: 'title',
          name: 'supabase',
          version: '1.0.0',
          install_source: 'registry',
          install_status: 'installed',
          package_assets: [],
          es_index_patterns: {},
        },
      } as any);

      await stepSaveSystemObject({
        ...baseArgs,
        savedObjectsClient: soClient,
        esClient,
        logger,
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'supabase',
            version: '1.0.0',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
            policy_templates: [{ name: 'supabase', inputs: [{ type: 'otelcol' }] } as any],
            data_streams: [
              {
                type: 'metrics',
                dataset: 'supabase.metrics',
                path: 'metrics',
                title: 'metrics',
                release: 'ga',
                streams: [{ input: 'otelcol' } as any],
              } as any,
            ],
          },
        },
      });

      const [, , esIndexPatternsUpdate] = soClient.update.mock.calls[1];
      expect(esIndexPatternsUpdate).toEqual({
        es_index_patterns: { metrics: 'metrics-supabase.metrics.otel-*' },
      });
    });

    it('keeps a stored entry for a dataset absent from the manifest', async () => {
      soClient.get.mockResolvedValue({
        id: 'test-integration',
        version: 'WzEsMV0=',
        attributes: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
          install_source: 'registry',
          install_status: 'installed',
          package_assets: [],
          es_index_patterns: { custom_dataset: 'logs-test-integration.custom_dataset-*' },
        },
      } as any);

      await stepSaveSystemObject({
        ...baseArgs,
        savedObjectsClient: soClient,
        esClient,
        logger,
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'test-integration',
            version: '1.0.0',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
          },
        },
      });

      const [, , esIndexPatternsUpdate] = soClient.update.mock.calls[1];
      expect(esIndexPatternsUpdate).toEqual({
        es_index_patterns: { custom_dataset: 'logs-test-integration.custom_dataset-*' },
      });
    });

    it('adds a manifest data stream missing from the stored map, with no OTel stream in the package', async () => {
      soClient.get.mockResolvedValue({
        id: 'all_assets',
        version: 'WzEsMV0=',
        attributes: {
          title: 'title',
          name: 'all_assets',
          version: '0.2.0',
          install_source: 'registry',
          install_status: 'installed',
          package_assets: [],
          es_index_patterns: { test_logs: 'logs-all_assets.test_logs-*' },
        },
      } as any);

      await stepSaveSystemObject({
        ...baseArgs,
        savedObjectsClient: soClient,
        esClient,
        logger,
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'all_assets',
            version: '0.2.0',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
            data_streams: [
              {
                type: 'logs',
                dataset: 'all_assets.test_logs',
                path: 'test_logs',
                title: 'test_logs',
                release: 'ga',
                streams: [{ input: 'logfile' } as any],
              } as any,
              {
                type: 'logs',
                dataset: 'all_assets.test_logs2',
                path: 'test_logs2',
                title: 'test_logs2',
                release: 'ga',
                streams: [{ input: 'logfile' } as any],
              } as any,
            ],
          },
        },
      });

      const [, , esIndexPatternsUpdate] = soClient.update.mock.calls[1];
      expect(esIndexPatternsUpdate).toEqual({
        es_index_patterns: {
          test_logs: 'logs-all_assets.test_logs-*',
          test_logs2: 'logs-all_assets.test_logs2-*',
        },
      });
    });

    it('carries the version returned by the read inside the retry', async () => {
      soClient.get.mockResolvedValue({
        id: 'test-integration',
        version: 'WzUsNV0=',
        attributes: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
          install_source: 'registry',
          install_status: 'installed',
          package_assets: [],
          es_index_patterns: {},
        },
      } as any);

      await stepSaveSystemObject({
        ...baseArgs,
        savedObjectsClient: soClient,
        esClient,
        logger,
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'test-integration',
            version: '1.0.0',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
          },
        },
      });

      const [, , , esIndexPatternsOptions] = soClient.update.mock.calls[1];
      expect(esIndexPatternsOptions).toEqual({ version: 'WzUsNV0=' });
    });

    it('retries once on a conflict and succeeds', async () => {
      soClient.get.mockResolvedValue({
        id: 'test-integration',
        version: 'WzEsMV0=',
        attributes: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
          install_source: 'registry',
          install_status: 'installed',
          package_assets: [],
          es_index_patterns: {},
        },
      } as any);
      soClient.update
        .mockResolvedValueOnce({} as any) // install-status update
        .mockRejectedValueOnce(
          SavedObjectsErrorHelpers.createConflictError('epm-packages', 'test-integration')
        )
        .mockResolvedValueOnce({} as any); // es_index_patterns update, second attempt

      await stepSaveSystemObject({
        ...baseArgs,
        savedObjectsClient: soClient,
        esClient,
        logger,
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'test-integration',
            version: '1.0.0',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
          },
        },
      });

      expect(soClient.update).toHaveBeenCalledTimes(3);
    });

    it('rethrows a non-conflict error without retrying', async () => {
      soClient.get.mockResolvedValue({
        id: 'test-integration',
        version: 'WzEsMV0=',
        attributes: {
          title: 'title',
          name: 'test-integration',
          version: '1.0.0',
          install_source: 'registry',
          install_status: 'installed',
          package_assets: [],
          es_index_patterns: {},
        },
      } as any);
      soClient.update
        .mockResolvedValueOnce({} as any) // install-status update
        .mockRejectedValueOnce(new Error('boom'));

      await expect(
        stepSaveSystemObject({
          ...baseArgs,
          savedObjectsClient: soClient,
          esClient,
          logger,
          packageInstallContext: {
            archiveIterator: createArchiveIteratorFromMap(new Map()),
            paths: [],
            packageInfo: {
              title: 'title',
              name: 'test-integration',
              version: '1.0.0',
              description: 'test',
              type: 'integration',
              categories: ['cloud', 'custom'],
              format_version: 'string',
              release: 'experimental',
              conditions: { kibana: { version: 'x.y.z' } },
              owner: { github: 'elastic/fleet' },
            },
          },
        })
      ).rejects.toThrow('boom');

      expect(soClient.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('es_index_patterns recompute for input packages', () => {
    const INPUT_OTEL_PACKAGE_INFO = {
      title: 'AWS CloudWatch (OpenTelemetry)',
      name: 'aws_cloudwatch_input_otel',
      version: '0.6.0',
      description: 'test',
      type: 'input',
      categories: ['custom'],
      format_version: 'string',
      release: 'beta',
      conditions: { kibana: { version: 'x.y.z' } },
      owner: { github: 'elastic/fleet' },
      policy_templates: [
        {
          name: 'aws.ec2',
          title: 'AWS EC2 OpenTelemetry Metrics',
          description: 'test',
          type: 'metrics',
          input: 'otelcol',
          template_path: 'input.yml.hbs',
        },
      ],
    } as any;

    let experimentalFeaturesSpy: jest.SpyInstance;

    beforeEach(() => {
      experimentalFeaturesSpy = jest
        .spyOn(appContextService, 'getExperimentalFeatures')
        .mockReturnValue({ enableOtelIntegrations: true } as any);
      soClient.get.mockResolvedValue({
        id: 'aws_cloudwatch_input_otel',
        attributes: {
          name: 'aws_cloudwatch_input_otel',
          version: '0.6.0',
          install_status: 'installed',
          package_assets: [],
        },
      } as any);
    });

    afterEach(() => {
      experimentalFeaturesSpy.mockRestore();
      mockedPackagePolicyService.list.mockReset();
    });

    const runStep = () =>
      stepSaveSystemObject({
        savedObjectsClient: soClient,
        esClient,
        logger,
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: INPUT_OTEL_PACKAGE_INFO,
        },
        installType: 'install',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
      });

    it('recomputes per-policy dataset patterns with .otel for an input package', async () => {
      mockedPackagePolicyService.list.mockResolvedValue({
        items: [
          {
            id: 'pp-1',
            package: { name: 'aws_cloudwatch_input_otel', version: '0.6.0' },
            inputs: [
              {
                type: 'otelcol',
                streams: [
                  {
                    data_stream: { type: 'metrics' },
                    vars: {
                      'data_stream.dataset': { value: 'aws_cloudwatch_input_otel.aws.ec2' },
                    },
                  },
                ],
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        perPage: 100,
      } as any);

      await runStep();

      expect(soClient.update).toHaveBeenCalledWith(
        PACKAGES_SAVED_OBJECT_TYPE,
        'aws_cloudwatch_input_otel',
        expect.objectContaining({
          es_index_patterns: expect.objectContaining({
            'aws_cloudwatch_input_otel.aws.ec2': 'metrics-aws_cloudwatch_input_otel.aws.ec2.otel-*',
          }),
        }),
        expect.anything()
      );
    });

    it('does not fail the install when listing package policies fails', async () => {
      mockedPackagePolicyService.list.mockRejectedValue(new Error('boom'));

      await expect(runStep()).resolves.not.toThrow();
      expect(soClient.update).toHaveBeenCalledWith(
        PACKAGES_SAVED_OBJECT_TYPE,
        'aws_cloudwatch_input_otel',
        expect.objectContaining({ es_index_patterns: expect.anything() }),
        expect.anything()
      );
    });
  });
});

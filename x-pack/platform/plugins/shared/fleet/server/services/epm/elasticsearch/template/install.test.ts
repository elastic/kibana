/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { range } from 'lodash';

import { createAppContextStartContractMock } from '../../../../mocks';
import { appContextService } from '../../..';
import { loadDatastreamsFieldsFromYaml } from '../../fields/field';
import type { PackageInstallContext, RegistryDataStream } from '../../../../../common/types';
import type { ExperimentalFeatures } from '../../../../../common/experimental_features';
import { createArchiveIteratorFromMap } from '../../archive/archive_iterator';

import { prepareTemplate, prepareToInstallTemplates } from './install';

jest.mock('../../fields/field', () => ({
  ...jest.requireActual('../../fields/field'),
  loadDatastreamsFieldsFromYaml: jest.fn(),
}));

const mockedLoadFieldsFromYaml = loadDatastreamsFieldsFromYaml as jest.MockedFunction<
  typeof loadDatastreamsFieldsFromYaml
>;
const packageInstallContext = {
  packageInfo: { name: 'package', version: '0.0.1' },
} as PackageInstallContext;

describe('EPM index template install', () => {
  beforeEach(async () => {
    appContextService.start(
      createAppContextStartContractMock({}, undefined, undefined, {
        enableOtelIntegrations: true,
      } as ExperimentalFeatures)
    );

    mockedLoadFieldsFromYaml.mockReturnValue([
      {
        name: 'test_dimension',
        dimension: true,
        type: 'keyword',
      },
    ]);
  });

  describe('prepareTemplate', () => {
    it('should use correct priority and index_patterns for data stream with dataset_is_prefix not set', async () => {
      const dataStreamDatasetIsPrefixUnset = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
      } as RegistryDataStream;

      const templateIndexPatternDatasetIsPrefixUnset = 'metrics-package.dataset-*';
      const templatePriorityDatasetIsPrefixUnset = 200;
      const {
        indexTemplate: { indexTemplate },
      } = await prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream: dataStreamDatasetIsPrefixUnset,
      });
      expect(indexTemplate.priority).toBe(templatePriorityDatasetIsPrefixUnset);
      expect(indexTemplate.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixUnset]);
    });

    it('should use correct priority and index_patterns for data stream with dataset_is_prefix set to false', async () => {
      const dataStreamDatasetIsPrefixFalse = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        dataset_is_prefix: false,
      } as RegistryDataStream;

      const templateIndexPatternDatasetIsPrefixFalse = 'metrics-package.dataset-*';
      const templatePriorityDatasetIsPrefixFalse = 200;
      const {
        indexTemplate: { indexTemplate },
      } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream: dataStreamDatasetIsPrefixFalse,
      });

      expect(indexTemplate.priority).toBe(templatePriorityDatasetIsPrefixFalse);
      expect(indexTemplate.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixFalse]);
    });

    it('should use correct priority and index_patterns for data stream with dataset_is_prefix set to true', async () => {
      const dataStreamDatasetIsPrefixTrue = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        dataset_is_prefix: true,
      } as RegistryDataStream;

      const templateIndexPatternDatasetIsPrefixTrue = 'metrics-package.dataset.*-*';
      const templatePriorityDatasetIsPrefixTrue = 150;
      const {
        indexTemplate: { indexTemplate },
      } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream: dataStreamDatasetIsPrefixTrue,
      });

      expect(indexTemplate.priority).toBe(templatePriorityDatasetIsPrefixTrue);
      expect(indexTemplate.index_patterns).toEqual([templateIndexPatternDatasetIsPrefixTrue]);
    });

    it('should set source mode to synthetics if specified', async () => {
      const dataStreamDatasetIsPrefixTrue = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        dataset_is_prefix: true,
        elasticsearch: {
          source_mode: 'synthetic',
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream: dataStreamDatasetIsPrefixTrue,
      });

      const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no mappings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping).toHaveProperty('source');
      expect(packageTemplate.settings?.index?.mapping?.source).toEqual({ mode: 'synthetic' });
    });

    it('should set source mode to synthetics if index_mode:time_series', async () => {
      const dataStreamDatasetIsPrefixTrue = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        dataset_is_prefix: true,
        elasticsearch: {
          index_mode: 'time_series',
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream: dataStreamDatasetIsPrefixTrue,
      });

      const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no settings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping).toHaveProperty('source');
      expect(packageTemplate.settings?.index?.mapping?.source).toEqual({ mode: 'synthetic' });
    });

    it('should not set source mode to synthetics if index_mode:time_series and user disabled synthetic', async () => {
      const dataStreamDatasetIsPrefixTrue = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        dataset_is_prefix: true,
        elasticsearch: {
          index_mode: 'time_series',
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        dataStream: dataStreamDatasetIsPrefixTrue,
        fieldAssetsMap: new Map(),
        experimentalDataStreamFeature: {
          data_stream: 'metrics-package.dataset',
          features: {
            synthetic_source: false,
            tsdb: false,
            doc_value_only_numeric: false,
            doc_value_only_other: false,
          },
        },
      });

      const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no settings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping).not.toHaveProperty('source');
    });

    it('should not set source mode to synthetics if specified but user disabled it', async () => {
      const dataStreamDatasetIsPrefixTrue = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        dataset_is_prefix: true,
        elasticsearch: {
          source_mode: 'synthetic',
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        dataStream: dataStreamDatasetIsPrefixTrue,
        fieldAssetsMap: new Map(),
        experimentalDataStreamFeature: {
          data_stream: 'metrics-package.dataset',
          features: {
            synthetic_source: false,
            tsdb: false,
            doc_value_only_numeric: false,
            doc_value_only_other: false,
          },
        },
      });

      const packageTemplate = componentTemplates['metrics-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no settings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping).not.toHaveProperty('source');
    });

    it('should set index_mode time series if index_mode:time_series', async () => {
      const dataStreamDatasetIsPrefixTrue = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        dataset_is_prefix: true,
        elasticsearch: {
          index_mode: 'time_series',
        },
      } as RegistryDataStream;

      const { indexTemplate } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream: dataStreamDatasetIsPrefixTrue,
      });

      expect(indexTemplate.indexTemplate.template.settings).toEqual({
        index: { mode: 'time_series' },
      });
    });

    it('should set ignore_malformed in settings', () => {
      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        elasticsearch: {
          'index_template.settings': {
            index: {
              mapping: {
                ignored_malformed: true,
              },
            },
          },
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        dataStream,
        fieldAssetsMap: new Map(),
      });

      const packageTemplate = componentTemplates['logs-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no settings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping).toEqual(
        expect.objectContaining({ ignored_malformed: true })
      );
    });

    it('should work with default total_fields.limit in settings', () => {
      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        dataStream,
        fieldAssetsMap: new Map(),
      });

      const packageTemplate = componentTemplates['logs-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no settings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping?.total_fields).toEqual(
        expect.objectContaining({ limit: 1000 })
      );
    });

    it('should work with extended total_fields.limit in settings due to more than 500 fields', () => {
      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
      } as RegistryDataStream;

      mockedLoadFieldsFromYaml.mockReturnValue(
        range(10).map((_, i) => ({
          name: `test_group${i}`,
          type: 'group',
          fields: range(60).map((__, j) => ({
            name: `test_field${i}_${j}`,
            type: 'keyword',
          })),
        }))
      );

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream,
      });

      const packageTemplate = componentTemplates['logs-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no settings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping?.total_fields).toEqual(
        expect.objectContaining({ limit: 10000 })
      );
    });

    it('should override total_fields in settings', () => {
      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        elasticsearch: {
          'index_template.settings': {
            index: {
              mapping: {
                total_fields: {
                  limit: 50000,
                },
              },
            },
          },
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream,
      });

      const packageTemplate = componentTemplates['logs-package.dataset@package'].template;

      if (!('settings' in packageTemplate)) {
        throw new Error('no settings on package template');
      }

      expect(packageTemplate.settings?.index?.mapping?.total_fields).toEqual(
        expect.objectContaining({ limit: 50000 })
      );
    });

    it('should set a runtime field in index_template.mappings', () => {
      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        elasticsearch: {
          'index_template.mappings': {
            runtime: {
              day_of_week: {
                type: 'keyword',
                script: {
                  source:
                    "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
                },
              },
            },
          },
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream,
      });

      const packageTemplate = componentTemplates['logs-package.dataset@package'].template;

      if (!('mappings' in packageTemplate)) {
        throw new Error('no mappings on package template');
      }

      expect(packageTemplate.mappings?.runtime).toEqual(
        expect.objectContaining({
          day_of_week: {
            type: 'keyword',
            script: {
              source:
                "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))",
            },
          },
        })
      );
    });

    it('should set a lifecycle field in index_template if ILM policies are disabled', () => {
      appContextService.start(
        createAppContextStartContractMock({
          internal: { disableILMPolicies: true },
        } as any)
      );

      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        lifecycle: {
          data_retention: '3d',
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream,
      });

      const packageTemplate = componentTemplates['logs-package.dataset@package'].template;

      expect(packageTemplate).toHaveProperty('lifecycle');
      if (!('lifecycle' in packageTemplate)) {
        throw new Error('no lifecycle on package template');
      }

      expect(packageTemplate.lifecycle).toEqual({ data_retention: '3d' });
    });

    it('should not set a lifecycle field in index_template if ILM policies are enabled', () => {
      appContextService.start(
        createAppContextStartContractMock({
          internal: { disableILMPolicies: false },
        } as any)
      );

      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        lifecycle: {
          data_retention: '3d',
        },
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream,
      });

      const packageTemplate = componentTemplates['logs-package.dataset@package'].template;

      expect(packageTemplate).not.toHaveProperty('lifecycle');
    });

    it('should include the correct templates for otel input packages when type is logs', () => {
      const otelInputPackageInstallContext = {
        packageInfo: {
          name: 'otel-input-package',
          version: '0.0.1',
          type: 'input',
          policy_templates: [
            {
              name: 'template1',
              title: 'HTTP Check',
              input: 'otelcol',
              type: 'logs',
              template_path: 'input.yml.hbs',
              vars: [],
            },
          ],
        },
        paths: ['path1'],
        archiveIterator: {},
      } as any as PackageInstallContext;
      appContextService.start(
        createAppContextStartContractMock(
          {
            internal: { disableILMPolicies: false },
          } as any,
          undefined,
          undefined,
          { enableOtelIntegrations: true } as ExperimentalFeatures
        )
      );

      const dataStream = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        lifecycle: {
          data_retention: '3d',
        },
        streams: [
          {
            input: 'otelcol',
            vars: [
              {
                name: 'period',
                type: 'text',
                title: 'Collection Interval',
                multi: false,
                required: true,
                show_user: true,
                default: '1m',
              },
            ],
          },
        ],
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext: otelInputPackageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream,
      });

      expect(componentTemplates).toStrictEqual({
        'logs-otel@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
        'logs-package.dataset@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
        'logs-package.dataset@package': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            mappings: {
              dynamic: true,
              dynamic_templates: undefined,
              properties: {
                test_dimension: {
                  type: 'keyword',
                },
              },
            },
            settings: {
              index: {
                default_pipeline: 'logs-package.dataset-0.0.1',
                lifecycle: {
                  name: 'logs@lifecycle',
                },
                mapping: {
                  total_fields: {
                    limit: 1000,
                  },
                },
              },
            },
          },
        },
        'logs@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
        'otel-input-package@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
      });
    });

    it('should include the correct templates for otel input packages when type is metrics', () => {
      const otelInputPackageInstallContext = {
        packageInfo: {
          name: 'otel-input-package',
          version: '0.0.1',
          type: 'input',
          policy_templates: [
            {
              name: 'template1',
              title: 'HTTP Check',
              input: 'otelcol',
              type: 'metrics',
              template_path: 'input.yml.hbs',
              vars: [],
            },
          ],
        },
        paths: ['path1'],
        archiveIterator: {},
      } as any as PackageInstallContext;
      appContextService.start(
        createAppContextStartContractMock(
          {
            internal: { disableILMPolicies: false },
          } as any,
          undefined,
          undefined,
          { enableOtelIntegrations: true } as ExperimentalFeatures
        )
      );

      const dataStream = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        lifecycle: {
          data_retention: '3d',
        },
        streams: [
          {
            input: 'otelcol',
            vars: [
              {
                name: 'period',
                type: 'text',
                title: 'Collection Interval',
                multi: false,
                required: true,
                show_user: true,
                default: '1m',
              },
            ],
          },
        ],
      } as RegistryDataStream;

      const { componentTemplates } = prepareTemplate({
        packageInstallContext: otelInputPackageInstallContext,
        fieldAssetsMap: new Map(),
        dataStream,
      });

      expect(componentTemplates).toStrictEqual({
        'metrics-otel@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
        'metrics-package.dataset@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
        'metrics-package.dataset@package': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            mappings: {
              dynamic: true,
              dynamic_templates: undefined,
              properties: {
                test_dimension: {
                  type: 'keyword',
                },
              },
            },
            settings: {
              index: {
                default_pipeline: 'metrics-package.dataset-0.0.1',
                lifecycle: {
                  name: 'metrics@lifecycle',
                },
                mapping: {
                  total_fields: {
                    limit: 1000,
                  },
                },
              },
            },
          },
        },
        'metrics@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
        'otel-input-package@custom': {
          _meta: {
            managed: true,
            managed_by: 'fleet',
            package: {
              name: 'otel-input-package',
            },
          },
          template: {
            settings: {},
          },
        },
      });
    });
  });

  describe('prepareToInstallTemplates', () => {
    it('should not include stack component templates in tracked assets', async () => {
      const dataStreamDatasetIsPrefixUnset = {
        type: 'logs',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
      } as RegistryDataStream;

      const { assetsToAdd } = await prepareToInstallTemplates(
        {
          packageInfo: {
            name: 'package',
            version: '0.0.1',
            data_streams: [dataStreamDatasetIsPrefixUnset],
          },
          archiveIterator: createArchiveIteratorFromMap(new Map()),
        } as PackageInstallContext,
        [],
        []
      );

      expect(assetsToAdd).not.toContainEqual({ id: 'logs@settings', type: 'component_template' });
    });

    it('should not include shared otel component templates in tracked assets', async () => {
      const dataStream = {
        type: 'metrics',
        dataset: 'package.dataset',
        title: 'test data stream',
        release: 'experimental',
        package: 'package',
        path: 'path',
        ingest_pipeline: 'default',
        lifecycle: {
          data_retention: '3d',
        },
        streams: [
          {
            input: 'otelcol',
            vars: [
              {
                name: 'period',
                type: 'text',
                title: 'Collection Interval',
                multi: false,
                required: true,
                show_user: true,
                default: '1m',
              },
            ],
          },
        ],
      } as RegistryDataStream;
      const otelInputPackageInfo = {
        packageInfo: {
          name: 'otel-input-package',
          version: '0.0.1',
          type: 'input',
          policy_templates: [
            {
              name: 'template1',
              title: 'HTTP Check',
              input: 'otelcol',
              type: 'metrics',
              template_path: 'input.yml.hbs',
              vars: [],
            },
          ],
          data_streams: [dataStream],
        },
        paths: ['path1'],
        archiveIterator: createArchiveIteratorFromMap(new Map()),
      } as any as PackageInstallContext;

      const { assetsToAdd } = await prepareToInstallTemplates(otelInputPackageInfo, [], []);

      expect(assetsToAdd).not.toContainEqual({
        id: 'metrics-otel@mappings',
        type: 'component_template',
      });
    });
  });
});

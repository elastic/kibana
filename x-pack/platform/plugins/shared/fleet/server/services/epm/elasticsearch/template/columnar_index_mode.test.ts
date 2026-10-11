/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Installation, RegistryDataStream, TemplateMap } from '../../../../types';

import {
  resolveColumnarIndexModes,
  resolveLogsdbColumnarIndexMode,
  stripColumnarIncompatibleMappings,
} from './columnar_index_mode';

describe('stripColumnarIncompatibleMappings', () => {
  const withMappings = (mappings: any): TemplateMap =>
    ({
      'logs-pkg.ds@package': { template: { settings: {}, mappings }, _meta: {} },
    } as unknown as TemplateMap);

  const strippedMappings = (mappings: any) =>
    (stripColumnarIncompatibleMappings(withMappings(mappings))['logs-pkg.ds@package'] as any)
      .template.mappings;

  it('removes doc_values: false and store: true from static fields', () => {
    expect(
      strippedMappings({
        properties: {
          message: { type: 'keyword', doc_values: false, store: true, ignore_above: 1024 },
        },
      })
    ).toEqual({
      properties: { message: { type: 'keyword', ignore_above: 1024 } },
    });
  });

  it('keeps doc_values: true and store: false', () => {
    expect(
      strippedMappings({
        properties: { message: { type: 'keyword', doc_values: true, store: false } },
      })
    ).toEqual({
      properties: { message: { type: 'keyword', doc_values: true, store: false } },
    });
  });

  it('recurses into nested properties and multi-fields', () => {
    expect(
      strippedMappings({
        properties: {
          event: {
            properties: {
              original: {
                type: 'keyword',
                doc_values: false,
                fields: { text: { type: 'text', store: true } },
              },
            },
          },
        },
      })
    ).toEqual({
      properties: {
        event: {
          properties: {
            original: { type: 'keyword', fields: { text: { type: 'text' } } },
          },
        },
      },
    });
  });

  it('strips dynamic templates', () => {
    expect(
      strippedMappings({
        properties: {},
        dynamic_templates: [
          { strings: { match_mapping_type: 'string', mapping: { type: 'keyword', store: true } } },
          { longs: { match_mapping_type: 'long', mapping: { type: 'long', doc_values: false } } },
        ],
      })
    ).toEqual({
      properties: {},
      dynamic_templates: [
        { strings: { match_mapping_type: 'string', mapping: { type: 'keyword' } } },
        { longs: { match_mapping_type: 'long', mapping: { type: 'long' } } },
      ],
    });
  });

  it('leaves component templates without mappings untouched', () => {
    const templates = {
      'logs-pkg.ds@custom': { template: { settings: {} }, _meta: {} },
    } as unknown as TemplateMap;

    expect(stripColumnarIncompatibleMappings(templates)).toEqual(templates);
  });
});

describe('resolveLogsdbColumnarIndexMode', () => {
  it.each(['unsupported', undefined] as const)(
    'returns undefined when the readiness is %s',
    (readiness) => {
      expect(
        resolveLogsdbColumnarIndexMode({ readiness, userChoice: true, isNewInstall: true })
      ).toBeUndefined();
    }
  );

  it('follows an explicit user choice', () => {
    expect(
      resolveLogsdbColumnarIndexMode({ readiness: 'opt_in', userChoice: true, isNewInstall: false })
    ).toEqual('logsdb_columnar');
    expect(
      resolveLogsdbColumnarIndexMode({
        readiness: 'default',
        userChoice: false,
        isNewInstall: true,
      })
    ).toBeUndefined();
  });

  it('applies `default` readiness on a new installation only', () => {
    expect(resolveLogsdbColumnarIndexMode({ readiness: 'default', isNewInstall: true })).toEqual(
      'logsdb_columnar'
    );
    expect(
      resolveLogsdbColumnarIndexMode({ readiness: 'default', isNewInstall: false })
    ).toBeUndefined();
  });

  it('does not apply `opt_in` readiness on a new installation', () => {
    expect(
      resolveLogsdbColumnarIndexMode({ readiness: 'opt_in', isNewInstall: true })
    ).toBeUndefined();
  });

  it('preserves the current mode on upgrade when the user has not chosen', () => {
    expect(
      resolveLogsdbColumnarIndexMode({
        readiness: 'default',
        isNewInstall: false,
        currentIndexMode: 'logsdb_columnar',
      })
    ).toEqual('logsdb_columnar');
    expect(
      resolveLogsdbColumnarIndexMode({
        readiness: 'default',
        isNewInstall: false,
        currentIndexMode: 'logsdb',
      })
    ).toBeUndefined();
  });
});

describe('resolveColumnarIndexModes', () => {
  const dataStream = (props: Partial<RegistryDataStream>): RegistryDataStream =>
    ({
      type: 'logs',
      dataset: 'pkg.ds',
      package: 'pkg',
      path: 'ds',
      title: 'ds',
      release: 'ga',
      ...props,
    } as RegistryDataStream);

  const setupEsClient = (currentIndexMode?: string) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getIndexTemplate.mockResponse({
      index_templates: [
        {
          name: 'logs-pkg.ds',
          index_template: {
            index_patterns: [],
            template: { settings: { index: currentIndexMode ? { mode: currentIndexMode } : {} } },
          },
        },
      ],
    } as any);
    return esClient;
  };

  it('applies the package `default` readiness to a fresh install without querying ES', async () => {
    const esClient = setupEsClient();

    const modes = await resolveColumnarIndexModes({
      esClient,
      logger: loggerMock.create(),
      packageInfo: { name: 'pkg', version: '1.0.0', elasticsearch: { logsdb_columnar: 'default' } },
      dataStreams: [dataStream({})],
    });

    expect(modes.get('logs-pkg.ds')).toEqual('logsdb_columnar');
    expect(esClient.indices.getIndexTemplate).not.toHaveBeenCalled();
  });

  it('ignores data streams that are not logs', async () => {
    const modes = await resolveColumnarIndexModes({
      packageInfo: { name: 'pkg', version: '1.0.0', elasticsearch: { logsdb_columnar: 'default' } },
      dataStreams: [dataStream({ type: 'metrics', dataset: 'pkg.metrics' })],
    });

    expect(modes.size).toEqual(0);
  });

  it('preserves the existing mode on upgrade when the user has not chosen', async () => {
    const esClient = setupEsClient('logsdb_columnar');

    const modes = await resolveColumnarIndexModes({
      esClient,
      logger: loggerMock.create(),
      packageInfo: { name: 'pkg', version: '2.0.0', elasticsearch: { logsdb_columnar: 'default' } },
      dataStreams: [dataStream({})],
      installedPkg: { name: 'pkg', version: '1.0.0' } as Installation,
    });

    expect(modes.get('logs-pkg.ds')).toEqual('logsdb_columnar');
  });

  it('removes the mode and warns when the data stream becomes unsupported', async () => {
    const esClient = setupEsClient('logsdb_columnar');
    const logger = loggerMock.create();

    const modes = await resolveColumnarIndexModes({
      esClient,
      logger,
      packageInfo: { name: 'pkg', version: '2.0.0', elasticsearch: { logsdb_columnar: 'default' } },
      dataStreams: [dataStream({ elasticsearch: { logsdb_columnar: 'unsupported' } })],
      installedPkg: { name: 'pkg', version: '1.0.0' } as Installation,
    });

    expect(modes.get('logs-pkg.ds')).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'logs-pkg.ds is marked unsupported for logsdb_columnar by pkg 2.0.0; moved back to LogsDB at next rollover'
    );
  });

  it('honours the installation-level user choice over the current mode', async () => {
    const esClient = setupEsClient();

    const modes = await resolveColumnarIndexModes({
      esClient,
      logger: loggerMock.create(),
      packageInfo: { name: 'pkg', version: '2.0.0', elasticsearch: { logsdb_columnar: 'opt_in' } },
      dataStreams: [dataStream({})],
      installedPkg: {
        name: 'pkg',
        version: '1.0.0',
        logsdb_columnar_enabled: true,
      } as Installation,
    });

    expect(modes.get('logs-pkg.ds')).toEqual('logsdb_columnar');
  });
});

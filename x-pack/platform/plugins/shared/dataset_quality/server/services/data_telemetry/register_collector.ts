/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { DataTelemetryObject } from './types';

const structureLevelSchema: MakeSchemaFrom<
  DataTelemetryObject,
  true
>['data']['items']['structure_level'] = {
  '0': {
    type: 'long',
    _meta: {
      description: 'Total docs at structure level 0',
    },
  },
  '1': {
    type: 'long',
    _meta: {
      description: 'Total docs at structure level 1',
    },
  },
  '2': {
    type: 'long',
    _meta: {
      description: 'Total docs at structure level 2',
    },
  },
  '3': {
    type: 'long',
    _meta: {
      description: 'Total docs at structure level 3',
    },
  },
  '4': {
    type: 'long',
    _meta: {
      description: 'Total docs at structure level 4',
    },
  },
  '5': {
    type: 'long',
    _meta: {
      description: 'Total docs at structure level 5',
    },
  },
  '6': {
    type: 'long',
    _meta: {
      description: 'Total docs at structure level 6',
    },
  },
};

export function registerLogsDataUsageCollector(
  usageCollection: UsageCollectionSetup,
  collectorOptions: {
    isReady: () => Promise<boolean>;
    fetch: () => Promise<DataTelemetryObject>;
  }
) {
  const logsUsageCollector = usageCollection.makeUsageCollector<DataTelemetryObject>({
    type: 'logs_data',
    isReady: collectorOptions.isReady,
    fetch: collectorOptions.fetch,
    schema: {
      data: {
        type: 'array',
        items: {
          pattern_name: {
            type: 'keyword',
            _meta: { description: 'Logs pattern name representing the stream of logs' },
          },
          shipper: {
            type: 'keyword',
            _meta: { description: 'Shipper if present, sending the logs' },
          },
          doc_count: {
            type: 'long',
            _meta: { description: 'Total number of documents in the steam of logs' },
          },
          structure_level: structureLevelSchema,
          failure_store_doc_count: {
            type: 'long',
            _meta: {
              description: 'Total number of documents in the failure store in the stream of logs',
            },
          },
          index_count: {
            type: 'long',
            _meta: {
              description: 'Total number of indices in the stream of logs',
            },
          },
          namespace_count: {
            type: 'long',
            _meta: {
              description: 'Total number of namespaces in the stream of logs',
            },
          },
          field_count: {
            type: 'long',
            _meta: {
              description: 'Total number of fields in mappings of indices of the stream of logs',
            },
          },
          field_existence: {
            DYNAMIC_KEY: {
              type: 'long',
              _meta: {
                description: 'Count of documents having the field represented by the key',
              },
            },
          },
          size_in_bytes: {
            type: 'long',
            _meta: {
              description: 'Total size in bytes of the stream of logs',
            },
          },
          managed_by: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'Value captured in _meta.managed_by',
              },
            },
          },
          package_name: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'Value captured in _meta.package.name',
              },
            },
          },
          beat: {
            type: 'array',
            items: { type: 'keyword', _meta: { description: 'Value captured in _meta.beat.name' } },
          },
        },
      },
    },
  });

  usageCollection.registerCollector(logsUsageCollector);
}

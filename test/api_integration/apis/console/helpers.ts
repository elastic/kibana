/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function helpers(getService: FtrProviderContext['getService']) {
  const client = getService('es');

  const createIndex = async (indexName: string) => {
    await client.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            foo: {
              type: 'text',
            },
          },
        },
      },
    });
  };

  const createAlias = async (indexName: string, aliasName: string) => {
    await client.indices.putAlias({
      index: indexName,
      name: aliasName,
    });
  };

  const createLegacyTemplate = async (templateName: string) => {
    await client.indices.putTemplate({
      name: templateName,
      body: {
        index_patterns: ['*'],
      },
    });
  };

  const createComponentTemplate = async (templateName: string) => {
    await client.cluster.putComponentTemplate({
      name: templateName,
      body: {
        template: {
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
                format: 'date_optional_time||epoch_millis',
              },
              message: {
                type: 'wildcard',
              },
            },
          },
        },
      },
    });
  };

  const createIndexTemplate = async (
    templateName: string,
    indexPatterns: string[],
    composedOf: string[]
  ) => {
    await client.indices.putIndexTemplate({
      name: templateName,
      body: {
        index_patterns: indexPatterns,
        data_stream: {},
        composed_of: composedOf,
        priority: 500,
      },
    });
  };

  const createDataStream = async (dataStream: string) => {
    await client.indices.createDataStream({
      name: dataStream,
    });
  };

  const deleteIndex = async (indexName: string) => {
    await client.indices.delete({
      index: indexName,
    });
  };

  const deleteAlias = async (indexName: string, aliasName: string) => {
    await client.indices.deleteAlias({
      index: indexName,
      name: aliasName,
    });
  };

  const deleteIndexTemplate = async (templateName: string) => {
    await client.indices.deleteIndexTemplate({
      name: templateName,
    });
  };

  const deleteComponentTemplate = async (templateName: string) => {
    await client.cluster.deleteComponentTemplate({
      name: templateName,
    });
  };

  const deleteLegacyTemplate = async (templateName: string) => {
    await client.indices.deleteTemplate({
      name: templateName,
    });
  };

  const deleteDataStream = async (dataStream: string) => {
    await client.indices.deleteDataStream({
      name: dataStream,
    });
  };

  return {
    createIndex,
    createAlias,
    createLegacyTemplate,
    createIndexTemplate,
    createComponentTemplate,
    createDataStream,
    deleteIndex,
    deleteAlias,
    deleteLegacyTemplate,
    deleteIndexTemplate,
    deleteComponentTemplate,
    deleteDataStream,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';
import type { IndexMode, TemplateDeserialized, TemplateSerialized } from '../../../../common';

// Serverless rejects `index.number_of_shards` and does not offer the `_source` field section.
export const getTemplateMock = (serverless: boolean) => ({
  settings: serverless ? {} : { number_of_shards: 1 },
  mappings: {
    properties: {
      host_name: { type: 'keyword' },
      created_at: { type: 'date', format: 'EEE MMM dd HH:mm:ss Z yyyy' },
    },
    ...(serverless ? {} : { _source: { enabled: false } }),
  },
  aliases: { alias1: {} },
});

// A legacy template carries `order` where a composable one carries `priority`.
export const getTemplatePayload = ({
  name,
  indexPatterns,
  serverless,
  isLegacy = false,
  indexMode,
}: {
  name: string;
  indexPatterns: string[];
  serverless: boolean;
  isLegacy?: boolean;
  indexMode?: IndexMode;
}): TemplateDeserialized => ({
  name,
  indexPatterns,
  indexMode,
  version: 1,
  template: getTemplateMock(serverless),
  _kbnMeta: { isLegacy, type: 'default', hasDatastream: false },
  allowAutoCreate: 'NO_OVERWRITE',
  ...(isLegacy ? { order: 1 } : { priority: 1 }),
});

export const getSerializedTemplate = (
  indexPatterns: string[],
  serverless: boolean
): TemplateSerialized => ({
  index_patterns: indexPatterns,
  template: getTemplateMock(serverless),
});

export const getTemplateVersion = async (esClient: EsClient, name: string) => {
  const templates = await esClient.cat.templates({ name, format: 'json' });
  return templates.find((template) => template.name === name)?.version;
};

export const templateExists = async (esClient: EsClient, name: string) =>
  (await esClient.cat.templates({ name, format: 'json' })).some(
    (template) => template.name === name
  );

export const deleteTemplate = async (esClient: EsClient, name: string) => {
  await esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] });
};

// The legacy template API does not exist on serverless, so this is stateful-only.
export const deleteLegacyTemplate = async (esClient: EsClient, name: string) => {
  await esClient.indices.deleteTemplate({ name }, { ignore: [404] });
};

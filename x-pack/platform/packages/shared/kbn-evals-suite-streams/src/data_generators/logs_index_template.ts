/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const SIGEVENTS_INDEX_TEMPLATE = 'sigevents-otel-logs';

/**
 * OTel Demo data requires two mapping workarounds for clean reindexing:
 *
 * 1. `subobjects: false` -- Different services emit `resource.attributes.app`
 *    as a flat string or a nested object. Flattening all fields to leaves
 *    eliminates the structural mapping conflict.
 *
 * 2. `ignore_malformed: true` -- Fields like `attributes.log.timestamp`
 *    contain epoch millis in scientific notation (e.g. `1.771443280796E12`)
 *    which ES's date parser rejects. Ignoring malformed values lets the
 *    document index successfully while silently dropping the unparseable field.
 */
export async function ensureLogsIndexTemplate(esClient: Client, log: ToolingLog): Promise<void> {
  log.debug(`Creating index template "${SIGEVENTS_INDEX_TEMPLATE}"`);

  await esClient.indices.putIndexTemplate({
    name: SIGEVENTS_INDEX_TEMPLATE,
    index_patterns: ['logs'],
    data_stream: {},
    template: {
      settings: {
        index: {
          mapping: {
            ignore_malformed: true,
          },
        },
      },
      mappings: {
        subobjects: false,
      },
    },
    priority: 500,
  });
}

export async function deleteLogsIndexTemplate(esClient: Client, log: ToolingLog): Promise<void> {
  try {
    await esClient.indices.deleteIndexTemplate({ name: SIGEVENTS_INDEX_TEMPLATE });
  } catch {
    log.debug(`Failed to delete index template "${SIGEVENTS_INDEX_TEMPLATE}" (may not exist)`);
  }
}

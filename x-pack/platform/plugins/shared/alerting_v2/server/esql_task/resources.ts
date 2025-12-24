/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
  IlmPolicy,
} from '@elastic/elasticsearch/lib/api/types';

import { spaceIdToNamespace } from '../lib/space_id_to_namespace';

const TOTAL_FIELDS_LIMIT = 2500;

export const DEFAULT_ALERTS_ILM_POLICY_NAME = '.alerts-ilm-policy';
export const DEFAULT_ALERTS_ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
        },
      },
    },
  },
};

function getIndexPattern(prefix: string) {
  return `${prefix}-*`;
}

async function retryTransientEsErrors<T>(
  fn: () => Promise<T>,
  { logger, retries = 3 }: { logger: Logger; retries?: number }
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const status = e?.meta?.statusCode;
      const isTransient = status === 408 || status === 429 || status === 503 || status === 504;
      if (!isTransient || attempt > retries) {
        throw e;
      }
      logger.debug(
        `Transient ES error (status=${status}) - retrying attempt ${attempt}/${retries}`
      );
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }
}

const ALERTS_WRITTEN_FIELDS_MAPPINGS: estypes.MappingTypeMapping = {
  dynamic: false,
  properties: {
    '@timestamp': { type: 'date' },
    alert: {
      dynamic: false,
      properties: {
        producer: { type: 'keyword' },
        uuid: { type: 'keyword' },
        grouping: {
          dynamic: 'strict',
          properties: {
            key: { type: 'keyword' },
          },
        },
        rule: {
          dynamic: 'strict',
          properties: {
            uuid: { type: 'keyword' },
            execution: {
              dynamic: 'strict',
              properties: {
                uuid: { type: 'keyword' },
              },
            },
          },
        },
        attributes: { type: 'flattened' },
      },
    },
    tags: { type: 'keyword' },
    labels: { type: 'object', enabled: true },
  },
};

export async function ensureAlertsResources({
  logger,
  esClient,
  dataStreamPrefix,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
  dataStreamPrefix: string;
}) {
  const componentTemplateName = `${dataStreamPrefix}-schema@component`;
  const indexTemplateName = `${dataStreamPrefix}-schema@index-template`;

  const componentTemplate: ClusterPutComponentTemplateRequest = {
    name: componentTemplateName,
    template: {
      mappings: ALERTS_WRITTEN_FIELDS_MAPPINGS,
    },
    _meta: {
      managed: true,
      description: `${getIndexPattern(
        dataStreamPrefix
      )} written-fields schema (alerting_v2 / ES|QL)`,
    },
  };

  const indexTemplate: IndicesPutIndexTemplateRequest = {
    name: indexTemplateName,
    index_patterns: [getIndexPattern(dataStreamPrefix)],
    data_stream: {},
    composed_of: [componentTemplateName],
    priority: 500,
    template: {
      settings: {
        'index.lifecycle.name': DEFAULT_ALERTS_ILM_POLICY_NAME,
        'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
        'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
      },
    },
    _meta: {
      managed: true,
      description: `${getIndexPattern(dataStreamPrefix)} index template (alerting_v2 / ES|QL)`,
    },
  };

  await Promise.all([
    (async () => {
      logger.debug(`Installing ILM policy ${DEFAULT_ALERTS_ILM_POLICY_NAME}`);
      await retryTransientEsErrors(
        () =>
          esClient.ilm.putLifecycle({
            name: DEFAULT_ALERTS_ILM_POLICY_NAME,
            policy: DEFAULT_ALERTS_ILM_POLICY,
          }),
        { logger }
      );
    })(),
    (async () => {
      await retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(componentTemplate), {
        logger,
      });
    })(),
    (async () => {
      await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(indexTemplate), {
        logger,
      });
    })(),
  ]);
}

export async function ensureAlertsDataStream({
  logger,
  esClient,
  dataStreamPrefix,
  spaceId,
  spaces,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
  dataStreamPrefix: string;
  spaceId: string;
  spaces?: SpacesPluginStart;
}) {
  const namespace = spaceIdToNamespace(spaces, spaceId) ?? 'default';
  const dataStreamName = `${dataStreamPrefix}-${namespace}`;

  try {
    await esClient.indices.createDataStream({ name: dataStreamName });
    logger.debug(`Created alerts data stream [${dataStreamName}]`);
  } catch (e) {
    // ignore "already exists"
    const status = e?.meta?.statusCode;
    if (status !== 400 && status !== 409) {
      throw e;
    }
  }

  return dataStreamName;
}

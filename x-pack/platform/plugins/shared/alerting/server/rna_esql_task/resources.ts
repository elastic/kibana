/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';

import {
  DEFAULT_ALERTS_ILM_POLICY,
  DEFAULT_ALERTS_ILM_POLICY_NAME,
  TOTAL_FIELDS_LIMIT,
  createOrUpdateComponentTemplate,
  createOrUpdateIndexTemplate,
} from '../alerts_service';
import { spaceIdToNamespace } from '../lib';
import { retryTransientEsErrors } from '../lib/retry_transient_es_errors';

function getIndexPattern(prefix: string) {
  return `${prefix}-*`;
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

  const ilmPolicyInstall = async () => {
    logger.debug(`Installing ILM policy ${DEFAULT_ALERTS_ILM_POLICY_NAME}`);
    await retryTransientEsErrors(
      () =>
        esClient.ilm.putLifecycle({
          name: DEFAULT_ALERTS_ILM_POLICY_NAME,
          policy: DEFAULT_ALERTS_ILM_POLICY,
        }),
      { logger }
    );
  };

  const componentTemplate: ClusterPutComponentTemplateRequest = {
    name: componentTemplateName,
    template: {
      mappings: ALERTS_WRITTEN_FIELDS_MAPPINGS,
    },
    _meta: {
      managed: true,
      description: `${getIndexPattern(dataStreamPrefix)} written-fields schema (RnA / ES|QL)`,
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
      },
    },
    _meta: {
      managed: true,
      description: `${getIndexPattern(dataStreamPrefix)} index template (RnA / ES|QL)`,
    },
  };

  await Promise.all([
    ilmPolicyInstall(),
    createOrUpdateComponentTemplate({
      logger,
      esClient,
      template: componentTemplate,
      totalFieldsLimit: TOTAL_FIELDS_LIMIT,
    }),
    createOrUpdateIndexTemplate({ logger, esClient, template: indexTemplate }),
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

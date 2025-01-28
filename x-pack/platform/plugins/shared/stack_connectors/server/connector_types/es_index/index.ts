/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { renderMustacheObject } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import {
  AlertHistoryEsIndexConnectorId,
  ALERT_HISTORY_PREFIX,
  buildAlertHistoryDocument,
  AlertingConnectorFeatureId,
  UptimeConnectorFeatureId,
  SecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import type {
  BulkOperationType,
  BulkResponseItem,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export type ESIndexConnectorType = ConnectorType<
  ConnectorTypeConfigType,
  {},
  ActionParamsType,
  unknown
>;
export type ESIndexConnectorTypeExecutorOptions = ConnectorTypeExecutorOptions<
  ConnectorTypeConfigType,
  {},
  ActionParamsType
>;

// config definition

export type ConnectorTypeConfigType = TypeOf<typeof ConfigSchema>;

const ConfigSchema = schema.object({
  index: schema.string(),
  refresh: schema.boolean({ defaultValue: false }),
  executionTimeField: schema.nullable(schema.string()),
});

// params definition

export type ActionParamsType = TypeOf<typeof ParamsSchema>;

// see: https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-index.html
// - timeout not added here, as this seems to be a generic thing we want to do
//   eventually: https://github.com/elastic/kibana/projects/26#card-24087404
const ParamsSchema = schema.object({
  documents: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
  indexOverride: schema.nullable(
    schema.string({
      validate: (pattern) => {
        if (!pattern.startsWith(ALERT_HISTORY_PREFIX)) {
          return `index must start with "${ALERT_HISTORY_PREFIX}"`;
        }
      },
    })
  ),
});

export const ConnectorTypeId = '.index';
// connector type definition
export function getConnectorType(): ESIndexConnectorType {
  return {
    id: ConnectorTypeId,
    minimumLicenseRequired: 'basic',
    name: i18n.translate('xpack.stackConnectors.esIndex.title', {
      defaultMessage: 'Index',
    }),
    supportedFeatureIds: [
      AlertingConnectorFeatureId,
      UptimeConnectorFeatureId,
      SecurityConnectorFeatureId,
    ],
    validate: {
      secrets: { schema: schema.object({}, { defaultValue: {} }) },
      config: {
        schema: ConfigSchema,
      },
      params: {
        schema: ParamsSchema,
      },
    },
    executor,
    renderParameterTemplates,
  };
}

// action executor

async function executor(
  execOptions: ESIndexConnectorTypeExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { actionId, config, params, services, logger } = execOptions;
  const index = params.indexOverride || config.index;

  const bulkBody = [];
  for (const document of params.documents) {
    const timeField = config.executionTimeField == null ? '' : config.executionTimeField.trim();
    if (timeField !== '') {
      document[timeField] = new Date();
    }

    bulkBody.push({ index: { op_type: 'create' } });
    bulkBody.push(document);
  }

  const bulkParams = {
    index,
    body: bulkBody,
    refresh: config.refresh,
  };

  try {
    const result = await services.scopedClusterClient.bulk(bulkParams);

    if (result.errors) {
      const errReason: string[] = [];
      const errCausedBy: string[] = [];
      // extract error reason and caused by
      (result.items ?? []).forEach((item: Partial<Record<BulkOperationType, BulkResponseItem>>) => {
        for (const [_, responseItem] of Object.entries(item)) {
          const reason = get(responseItem, 'error.reason');
          const causedBy = get(responseItem, 'error.caused_by.reason');
          if (reason) {
            errReason.push(reason);
          }
          if (causedBy) {
            errCausedBy.push(causedBy);
          }
        }
      });

      const errMessage =
        errReason.length > 0
          ? `${errReason.join(';')}${errCausedBy.length > 0 ? ` (${errCausedBy.join(';')})` : ''}`
          : `Indexing error but no reason returned.`;

      return wrapErr(errMessage, actionId, logger);
    }

    return { status: 'ok', data: result, actionId };
  } catch (err) {
    return wrapErr(err.message, actionId, logger);
  }
}

function renderParameterTemplates(
  logger: Logger,
  params: ActionParamsType,
  variables: Record<string, unknown>,
  actionId?: string
): ActionParamsType {
  const { documents, indexOverride } = renderMustacheObject<ActionParamsType>(
    logger,
    params,
    variables
  );

  if (actionId === AlertHistoryEsIndexConnectorId) {
    const alertHistoryDoc = buildAlertHistoryDocument(variables);
    if (!alertHistoryDoc) {
      throw new Error(`error creating alert history document for ${actionId} connector`);
    }
    return { documents: [alertHistoryDoc], indexOverride };
  }

  return { documents, indexOverride: null };
}

function wrapErr(
  errMessage: string,
  actionId: string,
  logger: Logger
): ConnectorTypeExecutorResult<unknown> {
  const message = i18n.translate('xpack.stackConnectors.esIndex.errorIndexingErrorMessage', {
    defaultMessage: 'error indexing documents',
  });
  logger.error(`error indexing documents: ${errMessage}`);
  return {
    status: 'error',
    actionId,
    message,
    serviceMessage: errMessage,
  };
}

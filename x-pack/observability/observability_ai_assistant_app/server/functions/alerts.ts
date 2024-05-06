/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { omit } from 'lodash';
import { KibanaRequest } from '@kbn/core/server';
import { FunctionRegistrationParameters } from '.';

const OMITTED_ALERT_FIELDS = [
  'tags',
  'event.action',
  'event.kind',
  'kibana.alert.rule.execution.uuid',
  'kibana.alert.rule.revision',
  'kibana.alert.rule.tags',
  'kibana.alert.rule.uuid',
  'kibana.alert.workflow_status',
  'kibana.space_ids',
  'kibana.alert.time_range',
  'kibana.version',
] as const;

const DEFAULT_FEATURE_IDS = [
  'apm',
  'infrastructure',
  'logs',
  'uptime',
  'slo',
  'observability',
] as const;

export function registerAlertsFunction({
  functions,
  resources,
  pluginsStart,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: 'alerts',
      contexts: ['core'],
      description:
        'Get alerts for Observability. Display the response in tabular format if appropriate.',
      descriptionForUser: 'Get alerts for Observability',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          featureIds: {
            type: 'array',
            additionalItems: false,
            items: {
              type: 'string',
              enum: DEFAULT_FEATURE_IDS,
            },
            description:
              'The Observability apps for which to retrieve alerts. By default it will return alerts for all apps.',
          },
          start: {
            type: 'string',
            description: 'The start of the time range, in Elasticsearch date math, like `now`.',
          },
          end: {
            type: 'string',
            description: 'The end of the time range, in Elasticsearch date math, like `now-24h`.',
          },
          filter: {
            type: 'string',
            description:
              'a KQL query to filter the data by. If no filter should be applied, leave it empty.',
          },
          includeRecovered: {
            type: 'boolean',
            description:
              'Whether to include recovered/closed alerts. Defaults to false, which means only active alerts will be returned',
          },
        },
        required: ['start', 'end'],
      } as const,
    },
    async (
      {
        arguments: {
          start: startAsDatemath,
          end: endAsDatemath,
          featureIds,
          filter,
          includeRecovered,
        },
      },
      signal
    ) => {
      const alertsClient = await pluginsStart.ruleRegistry.getRacClientWithRequest(
        resources.request as KibanaRequest
      );

      const start = datemath.parse(startAsDatemath)!.valueOf();
      const end = datemath.parse(endAsDatemath)!.valueOf();

      const kqlQuery = !filter ? [] : [toElasticsearchQuery(fromKueryExpression(filter))];

      const response = await alertsClient.find({
        featureIds:
          !!featureIds && !!featureIds.length
            ? featureIds
            : (DEFAULT_FEATURE_IDS as unknown as string[]),
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: start,
                    lte: end,
                  },
                },
              },
              ...kqlQuery,
              ...(!includeRecovered
                ? [
                    {
                      term: {
                        [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      });

      // trim some fields
      const alerts = response.hits.hits.map((hit) =>
        omit(hit._source, ...OMITTED_ALERT_FIELDS)
      ) as unknown as ParsedTechnicalFields[];

      return {
        content: {
          total: (response.hits as { total: { value: number } }).total.value,
          alerts,
        },
      };
    }
  );
}

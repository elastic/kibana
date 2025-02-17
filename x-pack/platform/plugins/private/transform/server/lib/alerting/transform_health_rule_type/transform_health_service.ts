/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { keyBy, memoize, partition } from 'lodash';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { TransformHealthRuleParams } from '@kbn/response-ops-rule-params/transform_health';
import type { TransformStats } from '../../../../common/types/transform_stats';
import {
  ALL_TRANSFORMS_SELECTION,
  mapEsHealthStatus2TransformHealthStatus,
  TRANSFORM_HEALTH_CHECK_NAMES,
  TRANSFORM_HEALTH_STATUS,
  TRANSFORM_NOTIFICATIONS_INDEX,
  TRANSFORM_RULE_TYPE,
  TRANSFORM_STATE,
} from '../../../../common/constants';
import { getResultTestConfig } from '../../../../common/utils/alerts';
import type {
  ErrorMessagesTransformResponse,
  TransformHealthAlertContext,
  TransformHealthAlertState,
  TransformStateReportResponse,
} from './register_transform_health_rule_type';
import type { TransformHealthAlertRule } from '../../../../common/types/alerting';
import { isContinuousTransform } from '../../../../common/types/transform';

interface TestResult {
  isHealthy: boolean;
  name: string;
  context: TransformHealthAlertContext;
}

type Transform = estypes.TransformGetTransformTransformSummary;

type TransformWithAlertingRules = Transform & { alerting_rules: TransformHealthAlertRule[] };

const maxPathComponentLength = 2000;

const TRANSFORM_PAGE_SIZE = 1000;

/** Number of transforms IDs mentioned in the context message */
const TRANSFORMS_IDS_MESSAGE_LIMIT = 10;

export function transformHealthServiceProvider({
  esClient,
  rulesClient,
  fieldFormatsRegistry,
}: {
  esClient: ElasticsearchClient;
  rulesClient?: RulesClient;
  fieldFormatsRegistry?: FieldFormatsRegistry;
}) {
  const transformsDict = new Map<string, Transform>();

  /**
   * Resolves result transform selection. Only continuously running transforms are included.
   * @param includeTransforms
   * @param excludeTransforms
   */
  const getResultsTransformIds = (
    transforms: Transform[],
    includeTransforms: string[],
    excludeTransforms: string[] | null
  ): Set<string> => {
    const continuousTransforms: Transform[] = transforms.filter(isContinuousTransform);

    continuousTransforms.forEach((t) => {
      transformsDict.set(t.id, t);
    });

    return new Set(
      continuousTransforms
        .filter(
          (t) =>
            includeTransforms.some((includedTransformId) =>
              new RegExp('^' + includedTransformId.replace(/\*/g, '.*') + '$').test(t.id)
            ) &&
            (Array.isArray(excludeTransforms) && excludeTransforms.length > 0
              ? excludeTransforms.every(
                  (excludedTransformId) =>
                    new RegExp('^' + excludedTransformId.replace(/\*/g, '.*') + '$').test(t.id) ===
                    false
                )
              : true)
        )
        .map((t) => t.id)
    );
  };

  /**
   * Returns a string with transform IDs for the context message.
   */
  const getContextMessageTransformIds = (transformIds: string[]): string => {
    const count = transformIds.length;
    let transformsString = transformIds.join(', ');
    if (transformIds.length > TRANSFORMS_IDS_MESSAGE_LIMIT) {
      transformsString = i18n.translate(
        'xpack.transform.alertTypes.transformHealth.truncatedTransformIdsMessage',
        {
          defaultMessage:
            '{truncatedTransformIds} and {restCount, plural, one {# other} other {# others}}',
          values: {
            truncatedTransformIds: transformIds.slice(0, TRANSFORMS_IDS_MESSAGE_LIMIT).join(', '),
            restCount: count - TRANSFORMS_IDS_MESSAGE_LIMIT,
          },
        }
      );
    }
    return transformsString;
  };

  const getTransformStats = memoize(
    async (transformIds: Set<string>): Promise<TransformStats[]> => {
      const transformIdsString = Array.from(transformIds).join(',');

      if (transformIdsString.length < maxPathComponentLength) {
        return (
          await esClient.transform.getTransformStats({
            transform_id: transformIdsString,
            // @ts-expect-error `basic` query option not yet in @elastic/elasticsearch
            basic: true,
            size: transformIds.size,
          })
        ).transforms as TransformStats[];
      } else {
        // Fetch all transforms and filter out the ones that are not in the list.
        return (
          (
            await esClient.transform.getTransformStats({
              // @ts-expect-error `basic` query option not yet in @elastic/elasticsearch
              basic: true,
              transform_id: '_all',
              size: TRANSFORM_PAGE_SIZE,
            })
          ).transforms as TransformStats[]
        ).filter((t) => transformIds.has(t.id));
      }
    }
  );

  function baseTransformAlertResponseFormatter(
    transformStats: TransformStats
  ): TransformStateReportResponse {
    const dateFormatter = fieldFormatsRegistry!.deserialize({ id: FIELD_FORMAT_IDS.DATE });

    return {
      transform_id: transformStats.id,
      description: transformsDict.get(transformStats.id)?.description,
      transform_state: transformStats.state,
      node_name: transformStats.node?.name,
      health_status: mapEsHealthStatus2TransformHealthStatus(transformStats.health?.status),
      ...(transformStats.health?.issues
        ? {
            issues: transformStats.health.issues.map((issue) => {
              return {
                issue: issue.issue,
                details: issue.details,
                count: issue.count,
                ...(issue.first_occurrence
                  ? { first_occurrence: dateFormatter.convert(issue.first_occurrence) }
                  : {}),
              };
            }),
          }
        : {}),
    };
  }

  return {
    /**
     * Returns report about not started transforms
     * @param transformIds
     *
     * @return - Partitions with not started and started transforms
     */
    async getTransformsStateReport(
      transformIds: Set<string>
    ): Promise<[TransformStateReportResponse[], TransformStateReportResponse[]]> {
      const transformsStats = await getTransformStats(transformIds);

      return partition(
        transformsStats.map(baseTransformAlertResponseFormatter),
        (t) =>
          t.transform_state !== TRANSFORM_STATE.STARTED &&
          t.transform_state !== TRANSFORM_STATE.INDEXING
      );
    },
    /**
     * Returns report about transforms that contain error messages
     * @deprecated This health check is no longer in use
     * @param transformIds
     */
    async getErrorMessagesReport(
      transformIds: Set<string>
    ): Promise<ErrorMessagesTransformResponse[]> {
      interface TransformErrorsBucket {
        key: string;
        doc_count: number;
        error_messages: estypes.AggregationsTopHitsAggregate;
      }

      const response = await esClient.search<
        unknown,
        Record<'by_transform', estypes.AggregationsMultiBucketAggregateBase<TransformErrorsBucket>>
      >({
        index: TRANSFORM_NOTIFICATIONS_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  level: 'error',
                },
              },
              {
                terms: {
                  transform_id: Array.from(transformIds),
                },
              },
            ],
          },
        },
        aggs: {
          by_transform: {
            terms: {
              field: 'transform_id',
              size: transformIds.size,
            },
            aggs: {
              error_messages: {
                top_hits: {
                  size: 10,
                  _source: {
                    includes: ['message', 'level', 'timestamp', 'node_name'],
                  },
                },
              },
            },
          },
        },
      });

      // If transform contains errors, it's in a failed state
      const transformsStats = await getTransformStats(transformIds);
      const failedTransforms = new Set(
        transformsStats.filter((t) => t.state === TRANSFORM_STATE.FAILED).map((t) => t.id)
      );

      return (response.aggregations?.by_transform.buckets as TransformErrorsBucket[])
        .map(({ key, error_messages: errorMessages }) => {
          return {
            transform_id: key,
            error_messages: errorMessages.hits.hits.map((v) => v._source),
          } as ErrorMessagesTransformResponse;
        })
        .filter((v) => failedTransforms.has(v.transform_id));
    },
    /**
     * Returns report about unhealthy transforms
     * @param transformIds
     */
    async getUnhealthyTransformsReport(
      transformIds: Set<string>
    ): Promise<TransformStateReportResponse[]> {
      const transformsStats = await getTransformStats(transformIds);

      return transformsStats
        .filter(
          (t) =>
            mapEsHealthStatus2TransformHealthStatus(t.health?.status) !==
            TRANSFORM_HEALTH_STATUS.green
        )
        .map(baseTransformAlertResponseFormatter);
    },
    /**
     * Returns results of the transform health checks
     * @param params
     */
    async getHealthChecksResults(
      params: TransformHealthRuleParams,
      previousState: TransformHealthAlertState
    ) {
      const includeAll = params.includeTransforms.some((id) => id === ALL_TRANSFORMS_SELECTION);

      const transforms = (
        await esClient.transform.getTransform({
          ...(includeAll ? {} : { transform_id: params.includeTransforms.join(',') }),
          allow_no_match: true,
          size: TRANSFORM_PAGE_SIZE,
        })
      ).transforms as Transform[];

      const transformIds = getResultsTransformIds(
        transforms,
        params.includeTransforms,
        params.excludeTransforms
      );

      const testsConfig = getResultTestConfig(params.testsConfig);

      const result: TestResult[] = [];

      if (testsConfig.notStarted.enabled) {
        const [notStartedTransform, startedTransforms] = await this.getTransformsStateReport(
          transformIds
        );

        const prevNotStartedSet: Set<string> = new Set(previousState?.notStarted ?? []);
        const recoveredTransforms = startedTransforms.filter((t) =>
          prevNotStartedSet.has(t.transform_id)
        );

        const isHealthy = notStartedTransform.length === 0;

        // if healthy, mention transforms that were not started
        const count = isHealthy ? recoveredTransforms.length : notStartedTransform.length;

        const transformsString = getContextMessageTransformIds(
          (isHealthy ? recoveredTransforms : notStartedTransform).map((t) => t.transform_id)
        );

        result.push({
          isHealthy,
          name: TRANSFORM_HEALTH_CHECK_NAMES.notStarted.name,
          context: {
            results: isHealthy ? recoveredTransforms : notStartedTransform,
            message: isHealthy
              ? i18n.translate(
                  'xpack.transform.alertTypes.transformHealth.notStartedRecoveryMessage',
                  {
                    defaultMessage:
                      '{count, plural, =0 {All transforms are started} one {Transform {transformsString} is started} other {# transforms are started: {transformsString}}}.',
                    values: { count, transformsString },
                  }
                )
              : i18n.translate('xpack.transform.alertTypes.transformHealth.notStartedMessage', {
                  defaultMessage:
                    '{count, plural, one {Transform {transformsString} is not started} other {# transforms are not started: {transformsString}}}.',
                  values: { count, transformsString },
                }),
          },
        });
      }

      if (testsConfig.errorMessages.enabled) {
        const response = await this.getErrorMessagesReport(transformIds);

        const isHealthy = response.length === 0;
        const count = response.length;
        const transformsString = response.map((t) => t.transform_id).join(', ');

        result.push({
          isHealthy,
          name: TRANSFORM_HEALTH_CHECK_NAMES.errorMessages.name,
          context: {
            results: isHealthy ? [] : response,
            message: isHealthy
              ? i18n.translate(
                  'xpack.transform.alertTypes.transformHealth.errorMessagesRecoveryMessage',
                  {
                    defaultMessage:
                      'No errors in the {count, plural, one {transform} other {transforms}} messages.',
                    values: { count: transformIds.size },
                  }
                )
              : i18n.translate('xpack.transform.alertTypes.transformHealth.errorMessagesMessage', {
                  defaultMessage:
                    '{count, plural, one {Transform} other {Transforms}} {transformsString} {count, plural, one {contains} other {contain}} error messages.',
                  values: { count, transformsString },
                }),
          },
        });
      }

      if (testsConfig.healthCheck.enabled) {
        const response = await this.getUnhealthyTransformsReport(transformIds);
        const isHealthy = response.length === 0;
        const count: number = isHealthy ? previousState?.unhealthy?.length ?? 0 : response.length;

        const transformsString = getContextMessageTransformIds(
          isHealthy ? previousState?.unhealthy ?? [] : response.map((t) => t.transform_id)
        );

        result.push({
          isHealthy,
          name: TRANSFORM_HEALTH_CHECK_NAMES.healthCheck.name,
          context: {
            results: isHealthy ? [] : response,
            message: isHealthy
              ? i18n.translate(
                  'xpack.transform.alertTypes.transformHealth.healthCheckRecoveryMessage',
                  {
                    defaultMessage:
                      '{count, plural, =0 {All transforms are healthy} one {Transform {transformsString} is healthy} other {# transforms are healthy: {transformsString}}}.',
                    values: { count, transformsString },
                  }
                )
              : i18n.translate('xpack.transform.alertTypes.transformHealth.healthCheckMessage', {
                  defaultMessage:
                    '{count, plural, one {Transform {transformsString} is unhealthy} other {# transforms are unhealthy: {transformsString}}}.',
                  values: { count, transformsString },
                }),
          },
        });
      }

      return result;
    },

    /**
     * Updates transform list with associated alerting rules.
     */
    async populateTransformsWithAssignedRules(
      transforms: Transform[]
    ): Promise<TransformWithAlertingRules[]> {
      const continuousTransforms = transforms.filter(
        isContinuousTransform
      ) as TransformWithAlertingRules[];

      if (!rulesClient) {
        throw new Error('Rules client is missing');
      }

      if (!continuousTransforms.length) {
        return transforms as TransformWithAlertingRules[];
      }

      const transformMap = keyBy(continuousTransforms, 'id');

      const transformAlertingRules = await rulesClient.find<TransformHealthRuleParams>({
        options: {
          perPage: 1000,
          filter: `alert.attributes.alertTypeId:${TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH}`,
        },
      });

      for (const ruleInstance of transformAlertingRules.data) {
        // Retrieve result transform IDs
        const { includeTransforms, excludeTransforms } = ruleInstance.params;

        const resultTransformIds = getResultsTransformIds(
          transforms,
          includeTransforms,
          excludeTransforms
        );

        resultTransformIds.forEach((transformId) => {
          const transformRef = transformMap[transformId] as TransformWithAlertingRules;

          if (transformRef) {
            if (Array.isArray(transformRef.alerting_rules)) {
              transformRef.alerting_rules.push(ruleInstance);
            } else {
              transformRef.alerting_rules = [ruleInstance];
            }
          }
        });
      }

      return continuousTransforms;
    },
  };
}

export type TransformHealthService = ReturnType<typeof transformHealthServiceProvider>;

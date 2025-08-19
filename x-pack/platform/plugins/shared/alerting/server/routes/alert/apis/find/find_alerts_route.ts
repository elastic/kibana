/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Inspired from existing API x-pack/platform/plugins/shared/rule_registry/server/search_strategy/search_strategy.ts
 *
 * Using search_after to merge searches from two various sources (sec rules w/ ES privs + o11y/stack rules w/ KB privs)
 *
 * Pitfalls:
 * - Cannot easily paginate, must follow cursor pattern
 *
 * Usage:
 * POST /internal/alerting/alerts/_find
 * {
    "sort": [{ "@timestamp": "desc" }],
    "query": {
        "bool": {
            "must": {
                "match_all": {}
            }
        }
    },
    "ruleTypeIds": [
        ".index-threshold",
        ".geo-containment",
        ".es-query",
        "streams.rules.esql",
        "transform_health",
        "observability.rules.custom_threshold",
        "slo.rules.burnRate",
        "xpack.ml.anomaly_detection_alert",
        "xpack.ml.anomaly_detection_jobs_health",
        "xpack.uptime.alerts.monitorStatus",
        "xpack.uptime.alerts.tlsCertificate",
        "xpack.uptime.alerts.durationAnomaly",
        "xpack.uptime.alerts.tls",
        "xpack.synthetics.alerts.monitorStatus",
        "xpack.synthetics.alerts.tls",
        "apm.transaction_duration",
        "apm.anomaly",
        "apm.error_rate",
        "apm.transaction_error_rate",
        "siem.eqlRule",
        "siem.esqlRule",
        "siem.savedQueryRule",
        "siem.indicatorRule",
        "siem.mlRule",
        "siem.queryRule",
        "siem.thresholdRule",
        "siem.newTermsRule",
        "siem.notifications",
        "logs.alert.document.count",
        "metrics.alert.inventory.threshold",
        "metrics.alert.threshold",
        "datasetQuality.degradedDocs",
        "monitoring_alert_cluster_health",
        "monitoring_alert_license_expiration",
        "monitoring_alert_cpu_usage",
        "monitoring_alert_missing_monitoring_data",
        "monitoring_alert_disk_usage",
        "monitoring_alert_thread_pool_search_rejections",
        "monitoring_alert_thread_pool_write_rejections",
        "monitoring_alert_jvm_memory_usage",
        "monitoring_alert_nodes_changed",
        "monitoring_alert_logstash_version_mismatch",
        "monitoring_alert_kibana_version_mismatch",
        "monitoring_alert_elasticsearch_version_mismatch",
        "monitoring_ccr_read_exceptions",
        "monitoring_shard_size"
    ]
}
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { isSiemRuleType } from '@kbn/rule-data-utils';
import { buildAlertFieldsRequest } from '@kbn/alerts-as-data-utils';
import type { Sort, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { SPACE_IDS, ALERT_RULE_CONSUMER, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';

import type { GetAlertIndicesAlias, ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import type { AlertingRequestHandlerContext } from '../../../../types';
import type { AlertingPluginsSetup, AlertingPluginsStart } from '../../../../plugin';
import type { AlertingAuthorizationClientFactory } from '../../../../alerting_authorization_client_factory';
import {
  ReadOperations,
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../../../authorization';

// TODO: Transform
const bodySchema = schema.object({
  ruleTypeIds: schema.arrayOf(schema.string()),
  consumers: schema.maybe(schema.string()),
  fields: schema.maybe(
    schema.arrayOf(
      schema.object({
        field: schema.string(),
        format: schema.maybe(schema.string()),
        include_unmapped: schema.maybe(schema.boolean()),
      })
    )
  ),
  // TODO: Query schema
  query: schema.maybe(schema.any()),
  // TODO: Sort schema
  sort: schema.maybe(
    schema.arrayOf(
      schema.recordOf(
        schema.string(),
        schema.oneOf([schema.literal('asc'), schema.literal('desc')])
      )
    )
  ),
  size: schema.maybe(schema.number()),
  search_after: schema.maybe(
    schema.arrayOf(
      schema.oneOf([schema.number(), schema.string(), schema.boolean(), schema.literal(null)])
    )
  ),
  runtimeMappings: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  minScore: schema.maybe(schema.number()),
  trackScores: schema.maybe(schema.boolean()),
  pagination: schema.maybe(
    schema.object({ pageIndex: schema.number(), pageSize: schema.number() })
  ),
});

export const findAlertsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  pluginsSetup: AlertingPluginsSetup,
  pluginsStart: () => Promise<AlertingPluginsStart>,
  alertingAuthorizationClientFactory: AlertingAuthorizationClientFactory,
  getAlertIndicesAlias: GetAlertIndicesAlias | undefined
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_find`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: 'Get information about alerts',
        tags: ['oas-tag:alerting'],
        // TODO: oasOperationObject
        // oasOperationObject: ...,
      },
      validate: {
        body: bodySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          if (req.body.pagination && req.body.search_after) {
            throw new Error('Cannot search_after and paginate at the same time');
          }

          let esRuleTypes = req.body.ruleTypeIds.filter(isSiemRuleType);
          let kbRuleTypes = req.body.ruleTypeIds.filter((type) => !isSiemRuleType(type));

          const startPlugins = await pluginsStart();

          const [space, kbSpaceAuthorization] = await Promise.all([
            startPlugins.spaces?.spacesService.getActiveSpace(req),
            alertingAuthorizationClientFactory.create(req),
          ]);

          const kbAuthzFilter = await kbSpaceAuthorization.getAuthorizationFilter({
            authorizationEntity: AlertingAuthorizationEntity.Alert,
            filterOpts: {
              type: AlertingAuthorizationFilterType.ESDSL,
              fieldNames: { consumer: ALERT_RULE_CONSUMER, ruleTypeId: ALERT_RULE_TYPE_ID },
            },
            operation: ReadOperations.Find,
          });

          const authorizedRuleTypes =
            await kbSpaceAuthorization.getAllAuthorizedRuleTypesFindOperation({
              authorizationEntity: AlertingAuthorizationEntity.Alert,
              ruleTypeIds: req.body.ruleTypeIds,
            });

          const authorizedRuleTypesIds = Array.from(authorizedRuleTypes.keys());
          esRuleTypes = esRuleTypes.filter((r) => authorizedRuleTypesIds.includes(r));
          kbRuleTypes = kbRuleTypes.filter((r) => authorizedRuleTypesIds.includes(r));

          const esAuthIndices = getAlertIndicesAlias!(esRuleTypes, space?.id);
          const kbAuthIndices = getAlertIndicesAlias!(kbRuleTypes, space?.id);

          const filter = req.body.query?.bool?.filter
            ? Array.isArray(req.body.query?.bool?.filter)
              ? req.body.query?.bool?.filter
              : [req.body.query?.bool?.filter]
            : [];

          const esFilter = filter.concat([]);
          const kbFilter = filter.concat({ bool: { filter: kbAuthzFilter.filter } });

          if (space?.id) {
            esFilter.push({ terms: { [SPACE_IDS]: [space.id, '*'] } });
            kbFilter.push({ terms: { [SPACE_IDS]: [space.id, '*'] } });
          }

          esFilter.push({ terms: { [ALERT_RULE_TYPE_ID]: esRuleTypes } });
          kbFilter.push({ terms: { [ALERT_RULE_TYPE_ID]: kbRuleTypes } });

          if (req.body.consumers) {
            esFilter.push({ terms: { [ALERT_RULE_CONSUMER]: req.body.consumers } });
            kbFilter.push({ terms: { [ALERT_RULE_CONSUMER]: req.body.consumers } });
          }

          const sort = req.body.sort
            ? [...req.body.sort, { _shard_doc: 'asc' }]
            : [{ '@timestamp': 'desc' }, { _shard_doc: 'asc' }];
          const requestedSize = req.body.size ?? 10;
          const fields = req.body.fields ?? [];
          fields.push({ field: 'kibana.alert.*', include_unmapped: false });

          const esAuthFields = fields.concat(
            { field: 'signal.*', include_unmapped: false },
            buildAlertFieldsRequest([], false)
          );
          const kbAuthFields = fields.concat({ field: '*', include_unmapped: true });

          const esQuery = {
            ...(req.body.query?.ids != null
              ? { ids: req.body.query.ids }
              : {
                  bool: {
                    ...req.body.query?.bool,
                    filter: esFilter,
                  },
                }),
          };
          const kbQuery = {
            ...(req.body.query?.ids != null
              ? { ids: req.body.query.ids }
              : {
                  bool: {
                    ...req.body.query?.bool,
                    filter: kbFilter,
                  },
                }),
          };

          const esAuthResult = await (
            await context.core
          ).elasticsearch.client.asCurrentUser.search({
            allow_no_indices: true,
            index: esAuthIndices,
            ignore_unavailable: true,
            body: {
              _source: false,
              fields: esAuthFields,
              sort,
              size: req.body.pagination
                ? req.body.pagination.pageSize +
                  req.body.pagination.pageIndex * req.body.pagination.pageSize
                : requestedSize,
              query: esQuery,
              search_after: req.body.search_after,
              ...(req.body.runtimeMappings ? { runtime_mappings: req.body.runtimeMappings } : {}),
              ...(req.body.minScore ? { min_score: req.body.minScore } : {}),
              ...(req.body.trackScores ? { track_scores: req.body.trackScores } : {}),
            },
          });

          const kbAuthResult = await (
            await context.core
          ).elasticsearch.client.asInternalUser.search({
            allow_no_indices: true,
            index: kbAuthIndices,
            ignore_unavailable: true,
            body: {
              _source: false,
              fields: kbAuthFields,
              sort,
              size: req.body.pagination
                ? req.body.pagination.pageSize +
                  req.body.pagination.pageIndex * req.body.pagination.pageSize
                : requestedSize,
              query: kbQuery,
              search_after: req.body.search_after,
              ...(req.body.runtimeMappings ? { runtime_mappings: req.body.runtimeMappings } : {}),
              ...(req.body.minScore ? { min_score: req.body.minScore } : {}),
              ...(req.body.trackScores ? { track_scores: req.body.trackScores } : {}),
            },
          });

          const sliceStart = req.body.pagination
            ? req.body.pagination.pageIndex * req.body.pagination.pageSize
            : 0;
          const sliceEnd = req.body.pagination
            ? req.body.pagination.pageIndex * req.body.pagination.pageSize + req.body.pagination.pageSize
            : requestedSize;
          const mergedResult = {
            hits: {
              total: {
                value: esAuthResult.hits.total?.value + kbAuthResult.hits.total?.value,
                relation:
                  esAuthResult.hits.total?.relation === 'gte' ||
                  kbAuthResult.hits.total?.relation === 'gte'
                    ? 'gte'
                    : 'eq',
              },
              hits: esAuthResult.hits.hits
                .concat(kbAuthResult.hits.hits)
                .sort(makeEsSortComparator(sort))
                .slice(sliceStart, sliceEnd),
            },
          };

          return res.ok({
            body: mergedResult,
          });
        } catch (e) {
          console.log('ERROR', e);
          throw e;
        }
      })
    )
  );
};

function makeEsSortComparator(sortDefinition: Sort) {
  const sortDefAsArray = Array.isArray(sortDefinition) ? sortDefinition : [sortDefinition];
  const normalized = sortDefAsArray.map((item) => {
    if (typeof item === 'string') {
      return { field: item, order: 'asc' };
    }
    const field = Object.keys(item)[0];
    const order = item[field] || 'asc';
    return { field, order };
  });

  return function compareEsSort(a: SearchHit, b: SearchHit) {
    const sortA = a.sort;
    const sortB = b.sort;

    for (let i = 0; i < normalized.length; i++) {
      const { order } = normalized[i];
      const dir = order === 'desc' ? -1 : 1;

      if (sortA[i] < sortB[i]) return -1 * dir;
      if (sortA[i] > sortB[i]) return 1 * dir;
    }

    return 0;
  };
}

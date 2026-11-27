/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isNonLocalIndexName } from '@kbn/es-query';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { AddAlertsStepInput } from '../../../common/workflows/steps/add_alerts';
import { MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { getRuleId, getRuleName } from '../../../common/utils/attachments';

type AlertInput = AddAlertsStepInput['alerts'][number];

/**
 * Sets each alert's `rule` from the alert document. The case's rule link opens the rule by its
 * saved-object id (`kibana.alert.rule.uuid`), but a model often passes the signature `rule_id` or
 * no id at all, and the link then reports the rule as deleted. The model's values are kept only
 * for alerts whose document cannot be read.
 *
 * Searches each index rather than `mget`-ing it: models usually pass the alerts alias, and
 * single-document reads through an alias fail once it spans more than one index (after the first
 * rollover). Remote indices are skipped, since their rules are not in this deployment.
 */
export const resolveAlertRules = async ({
  alerts,
  esClient,
  logger,
}: {
  alerts: AlertInput[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<AlertInput[]> => {
  const idsByIndex = new Map<string, Set<string>>();
  for (const { alertId, index } of alerts) {
    if (alertId !== '' && index !== '' && !isNonLocalIndexName(index)) {
      idsByIndex.set(index, (idsByIndex.get(index) ?? new Set()).add(alertId));
    }
  }

  const sourcesByIndex = new Map<string, Map<string, unknown>>();

  await pMap(
    Array.from(idsByIndex.entries()),
    async ([index, ids]) => {
      try {
        const { hits } = await esClient.search({
          index,
          // Room for an id to show up twice, so a duplicate is seen as one rather than read as unique.
          size: ids.size * 2,
          query: { ids: { values: Array.from(ids) } },
          _source: [ALERT_RULE_UUID, ALERT_RULE_NAME],
          track_total_hits: false,
          ignore_unavailable: true,
          allow_no_indices: true,
        });

        // Ids are unique only within an index, so an id found in several backing indices of an
        // alias is ambiguous and keeps the model's values.
        const sourcesById = new Map<string, unknown>();
        for (const { _id: id, _source: source } of hits.hits) {
          if (id != null && source != null) {
            sourcesById.set(id, sourcesById.has(id) ? undefined : source);
          }
        }
        sourcesByIndex.set(index, sourcesById);
      } catch (error) {
        logger.debug(`Could not read alerts in ${index} to resolve their rules: ${error}`);
      }
    },
    { concurrency: MAX_CONCURRENT_SEARCHES }
  );

  return alerts.map((alert) => {
    const source = sourcesByIndex.get(alert.index)?.get(alert.alertId);
    if (source == null) {
      return alert;
    }

    const id = getRuleId(null, source) ?? alert.rule?.id;
    const name = getRuleName(null, source) ?? alert.rule?.name;

    return {
      ...alert,
      rule: { ...(id != null ? { id } : {}), ...(name != null ? { name } : {}) },
    };
  });
};

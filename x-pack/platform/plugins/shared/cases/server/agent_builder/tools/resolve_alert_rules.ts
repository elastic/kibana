/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { AddAlertsStepInput } from '../../../common/workflows/steps/add_alerts';
import { getRuleId, getRuleName } from '../../../common/utils/attachments';

type AlertInput = AddAlertsStepInput['alerts'][number];

/**
 * Sets each alert's `rule` from the alert document. The case's rule link opens the rule by its
 * saved-object id (`kibana.alert.rule.uuid`), but a model often passes the signature `rule_id` or
 * no id at all, and the link then reports the rule as deleted. The model's values are kept only
 * for alerts whose document cannot be read.
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
  if (alerts.length === 0) {
    return alerts;
  }

  let docs: Array<{ _source?: unknown; found?: boolean }>;
  try {
    const response = await esClient.mget({
      docs: alerts.map(({ alertId, index }) => ({
        _id: alertId,
        _index: index,
        _source: [ALERT_RULE_UUID, ALERT_RULE_NAME],
      })),
    });
    docs = response.docs as typeof docs;
  } catch (error) {
    logger.debug(`Could not read alerts to resolve their rules: ${error}`);
    return alerts;
  }

  return alerts.map((alert, i) => {
    const doc = docs[i];
    if (doc?.found !== true || doc._source == null) {
      return alert;
    }

    const id = getRuleId(null, doc._source) ?? alert.rule?.id;
    const name = getRuleName(null, doc._source) ?? alert.rule?.name;

    return {
      ...alert,
      rule: { ...(id != null ? { id } : {}), ...(name != null ? { name } : {}) },
    };
  });
};

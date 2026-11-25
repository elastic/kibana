/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_TRIGGER,
  MATCH_ON_CATALOG,
  MATCH_ON_CUSTOM,
  TARGET_TYPE_ESCALATION_POLICY,
  TARGET_TYPE_FUNCTIONALITY,
  TARGET_TYPE_SERVICE,
  TARGET_TYPE_TEAM,
  TARGET_TYPE_USER,
} from '@kbn/connector-schemas/rootly_alerts/constants';
import type { ActionParamsType, PagingTarget } from '@kbn/connector-schemas/rootly_alerts';

export type RootlyAlertsEventBody = Record<string, unknown>;

const ROOTLY_TARGET_TYPES: Record<PagingTarget['type'], string> = {
  [TARGET_TYPE_SERVICE]: 'Service',
  [TARGET_TYPE_TEAM]: 'Group',
  [TARGET_TYPE_ESCALATION_POLICY]: 'EscalationPolicy',
  [TARGET_TYPE_USER]: 'User',
  [TARGET_TYPE_FUNCTIONALITY]: 'Functionality',
};

// A trigger with no key takes the rule and alert IDs, which is what a recovery action sends by default.
export const getDedupKey = (params: ActionParamsType): string | undefined => {
  const dedupKey = params.dedupKey?.trim();
  if (dedupKey) {
    return dedupKey;
  }
  const ruleId = params.ruleId?.trim();
  const alertId = params.alertId?.trim();
  return ruleId && alertId ? `${ruleId}:${alertId}` : undefined;
};

// Shared by the executor and the preview in the action form. Empty values are left out.
export const getEventBody = (params: ActionParamsType): RootlyAlertsEventBody => {
  const event = params.event ?? EVENT_TRIGGER;
  const body: RootlyAlertsEventBody = { event, dedup_key: params.dedupKey ?? '' };

  if (event !== EVENT_TRIGGER) {
    return body;
  }

  body.title = params.title ?? '';

  const description = params.description?.trim();
  if (description) {
    body.description = description;
  }

  const url = params.url?.trim();
  if (url) {
    body.url = url;
  }

  const urgency = params.urgency?.trim();
  if (urgency) {
    body.urgency = urgency;
  }

  // A target is paged in place of the alert routes, so the routing value is not sent with it.
  const matchValue = params.match?.value?.trim();
  if (params.target) {
    body.rootly = {
      notification_target: {
        type: ROOTLY_TARGET_TYPES[params.target.type],
        id: params.target.id?.trim() ?? '',
      },
    };
  } else if (params.match && matchValue) {
    if (params.match.on === MATCH_ON_CATALOG) {
      const catalog = params.match.catalog?.trim();
      if (catalog) {
        body.catalogs = { [catalog]: matchValue };
      }
    } else if (params.match.on === MATCH_ON_CUSTOM) {
      body.routing_key = matchValue;
    } else {
      body[params.match.on] = matchValue;
    }
  }

  const labels = (params.labels ?? [])
    .map(({ key, value }): [string, string] => [key.trim(), value.trim()])
    .filter(([key, value]) => key && value);
  if (labels.length > 0) {
    body.labels = Object.fromEntries(labels);
  }

  if (params.customDetails) {
    body.custom = JSON.parse(params.customDetails);
  }

  body.kibana = {
    rule_id: params.ruleId ?? '',
    rule_name: params.ruleName ?? '',
    alert_id: params.alertId ?? '',
    space: params.space ?? '',
    url: url ?? '',
    evaluation_time: params.evaluationTime ?? '',
  };

  return body;
};

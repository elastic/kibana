/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  EventTypeOpts,
  RootSchema,
} from '@kbn/core-analytics-browser';

/**
 * Fired once, right after a rule's create API call resolves successfully. Unlike the
 * `data-ebt-*` click attributes on the save buttons (see `getRuleSaveEbtProps`), this is a
 * bespoke EBT event rather than a click attribute, because the rule's id doesn't exist yet at
 * click-time during the create flow -- it's only known once the API call resolves.
 */
export const RULE_CREATED_EVENT_TYPE = 'rule_created';

export interface RuleCreatedEventData {
  rule_id: string;
  rule_type_id: string;
  /** Parsed from the URL when the rule was created from a template, e.g. `/create/template/{template_id}`. */
  template_id?: string;
  /** Only present for SLO burn rate rules (`rule_type_id === 'slo.rules.burnRate'`). */
  slo_id?: string;
  /** Ids of the dashboards linked to the rule via `artifacts.dashboards`. */
  dashboard_ids?: string[];
}

const schema: RootSchema<RuleCreatedEventData> = {
  rule_id: {
    type: 'keyword',
    _meta: {
      description: 'The id of the newly created rule.',
    },
  },
  rule_type_id: {
    type: 'keyword',
    _meta: {
      description: 'The rule type id of the newly created rule.',
    },
  },
  template_id: {
    type: 'keyword',
    _meta: {
      description:
        'The id of the alert/SLO template the rule was created from, when applicable.',
      optional: true,
    },
  },
  slo_id: {
    type: 'keyword',
    _meta: {
      description: "The linked SLO's id, only present for SLO burn rate rules.",
      optional: true,
    },
  },
  dashboard_ids: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: {
        description: 'The id of a dashboard linked to the rule.',
      },
    },
    _meta: {
      description: 'Ids of the dashboards linked to the rule via artifacts.dashboards.',
      optional: true,
    },
  },
};

const eventTypeOpts: EventTypeOpts<RuleCreatedEventData> = {
  eventType: RULE_CREATED_EVENT_TYPE,
  schema,
};

/** Call once, from a plugin's `setup()`, before any `reportRuleCreatedEvent` calls. */
export function registerRuleCreatedEventType(analytics: AnalyticsServiceSetup) {
  analytics.registerEventType(eventTypeOpts);
}

export function reportRuleCreatedEvent(
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>,
  data: RuleCreatedEventData
) {
  analytics.reportEvent(RULE_CREATED_EVENT_TYPE, data);
}

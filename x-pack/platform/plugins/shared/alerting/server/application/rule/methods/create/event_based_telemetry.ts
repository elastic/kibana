/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';

export interface RuleCreatedEventData {
  rule_id: string;
  template_id?: string;
  created_at: string;
  rule_type_id: string;
  enabled: boolean;
  consumer: string;
  producer: string;
  /** Present when rule_type_id is slo.rules.burnRate — the monitored SLO id. */
  slo_id?: string;
  /** Linked dashboard artifact ids from artifacts.dashboards[], when present. */
  dashboard_ids?: string[];
  /** Rule schedule interval (e.g. `1m`, `5m`). */
  schedule_interval: string;
  /** Number of connector actions + system actions on the created rule. */
  actions_count: number;
  /** Unique action type ids (e.g. `.email`, `.slack`), when any actions are present. */
  action_type_ids?: string[];
  /** Resolved notify-when setting, when set. */
  notify_when?: string;
  /** Rule type category from the registry. */
  rule_type_category: string;
  /** Rule type solution from the registry (e.g. `stack`, `observability`). */
  rule_type_solution: string;
  /** Alert-delay `active` threshold, when alert delay is configured. */
  alert_delay?: number;
}

export const RULE_CREATED_EVENT: EventTypeOpts<RuleCreatedEventData> = {
  eventType: 'alerting_rule_created',
  schema: {
    rule_id: {
      type: 'keyword',
      _meta: {
        description: 'The id of the newly created rule.',
        optional: false,
      },
    },
    template_id: {
      type: 'keyword',
      _meta: {
        description:
          'The id of the rule template the rule was created from, when known (for example, from the rule gallery or a Fleet-installed package).',
        optional: true,
      },
    },
    created_at: {
      type: 'date',
      _meta: {
        description: 'ISO timestamp of when the rule was created.',
        optional: false,
      },
    },
    rule_type_id: {
      type: 'keyword',
      _meta: {
        description: 'The rule type identifier (e.g. `.es-query`).',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Whether the rule was created in an enabled state.',
        optional: false,
      },
    },
    consumer: {
      type: 'keyword',
      _meta: {
        description: 'The consumer (feature/application) that owns the rule.',
        optional: false,
      },
    },
    producer: {
      type: 'keyword',
      _meta: {
        description: 'The rule type producer, as registered by the owning plugin.',
        optional: false,
      },
    },
    slo_id: {
      type: 'keyword',
      _meta: {
        description: 'For burn-rate rules (slo.rules.burnRate), the id of the SLO being monitored.',
        optional: true,
      },
    },
    dashboard_ids: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Ids of dashboards linked via rule artifacts.dashboards.',
        },
      },
      _meta: {
        description: 'Linked dashboard artifact ids, when the rule has any.',
        optional: true,
      },
    },
    schedule_interval: {
      type: 'keyword',
      _meta: {
        description: 'The rule schedule interval (e.g. `1m`, `5m`).',
        optional: false,
      },
    },
    actions_count: {
      type: 'long',
      _meta: {
        description: 'Number of connector actions plus system actions on the created rule.',
        optional: false,
      },
    },
    action_type_ids: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'An action type id (e.g. `.email`, `.slack`).',
        },
      },
      _meta: {
        description: 'Unique action type ids used by the rule actions, when any are present.',
        optional: true,
      },
    },
    notify_when: {
      type: 'keyword',
      _meta: {
        description:
          'Resolved notify-when setting (`onActionGroupChange`, `onActiveAlert`, or `onThrottleInterval`).',
        optional: true,
      },
    },
    rule_type_category: {
      type: 'keyword',
      _meta: {
        description: 'The rule type category from the rule type registry.',
        optional: false,
      },
    },
    rule_type_solution: {
      type: 'keyword',
      _meta: {
        description: 'The rule type solution from the rule type registry (e.g. `stack`).',
        optional: false,
      },
    },
    alert_delay: {
      type: 'long',
      _meta: {
        description:
          'Alert-delay active threshold (consecutive runs before alerting), when configured.',
        optional: true,
      },
    },
  },
};

export const ruleCreateTelemetryEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  RULE_CREATED_EVENT,
];

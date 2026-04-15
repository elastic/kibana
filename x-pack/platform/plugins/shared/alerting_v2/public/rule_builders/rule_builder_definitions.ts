/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type RuleBuilderId =
  | 'threshold_alert'
  | 'service_latency'
  | 'slo_burn_rate'
  | 'change_point_detection'
  | 'rate_ratio'
  | 'event_rate'
  | 'counter_rate';

export type RuleBuilderBadge = 'advanced' | 'requires_tsdb';

export interface RuleBuilderDefinition {
  id: RuleBuilderId;
  title: string;
  description: string;
  replaces: string;
  iconType: IconType;
  badge?: RuleBuilderBadge;
}

/** Shown on the rules list empty state (subset of all builders). */
export const FEATURED_RULE_BUILDER_IDS: RuleBuilderId[] = [
  'threshold_alert',
  'service_latency',
  'change_point_detection',
];

export const RULE_BUILDERS: RuleBuilderDefinition[] = [
  {
    id: 'threshold_alert',
    title: i18n.translate('xpack.alertingV2.ruleBuilders.thresholdAlert.title', {
      defaultMessage: 'Threshold Alert',
    }),
    description: i18n.translate('xpack.alertingV2.ruleBuilders.thresholdAlert.description', {
      defaultMessage:
        'Monitor one or more metrics and alert when they cross a threshold. Multi-condition support with custom aggregations.',
    }),
    replaces: i18n.translate('xpack.alertingV2.ruleBuilders.thresholdAlert.replaces', {
      defaultMessage: 'Custom threshold, Metric threshold',
    }),
    iconType: 'bell',
  },
  {
    id: 'service_latency',
    title: i18n.translate('xpack.alertingV2.ruleBuilders.serviceLatency.title', {
      defaultMessage: 'Service Latency',
    }),
    description: i18n.translate('xpack.alertingV2.ruleBuilders.serviceLatency.description', {
      defaultMessage:
        "Alert when a service's response time exceeds a threshold. Pick service, transaction type, percentile, and environment.",
    }),
    replaces: i18n.translate('xpack.alertingV2.ruleBuilders.serviceLatency.replaces', {
      defaultMessage: 'APM latency rule',
    }),
    iconType: 'apmTrace',
  },
  {
    id: 'slo_burn_rate',
    title: i18n.translate('xpack.alertingV2.ruleBuilders.sloBurnRate.title', {
      defaultMessage: 'SLO Burn Rate',
    }),
    description: i18n.translate('xpack.alertingV2.ruleBuilders.sloBurnRate.description', {
      defaultMessage:
        "Alert when an SLO's error budget is being consumed too fast, using multi-window burn rate detection with automatic severity.",
    }),
    replaces: i18n.translate('xpack.alertingV2.ruleBuilders.sloBurnRate.replaces', {
      defaultMessage: 'SLO burn rate rule',
    }),
    iconType: 'flag',
    badge: 'advanced',
  },
  {
    id: 'change_point_detection',
    title: i18n.translate('xpack.alertingV2.ruleBuilders.changePointDetection.title', {
      defaultMessage: 'Change Point Detection',
    }),
    description: i18n.translate('xpack.alertingV2.ruleBuilders.changePointDetection.description', {
      defaultMessage:
        'Detect statistically significant changes in a metric automatically. No manual thresholds — uses ES|QL CHANGE_POINT.',
    }),
    replaces: i18n.translate('xpack.alertingV2.ruleBuilders.changePointDetection.replaces', {
      defaultMessage: 'New capability (no v1 equivalent)',
    }),
    iconType: 'analyzeEvent',
  },
  {
    id: 'rate_ratio',
    title: i18n.translate('xpack.alertingV2.ruleBuilders.rateRatio.title', {
      defaultMessage: 'Rate / Ratio',
    }),
    description: i18n.translate('xpack.alertingV2.ruleBuilders.rateRatio.description', {
      defaultMessage:
        'Alert when the ratio of matching events exceeds a threshold. Error rates, success rates, cache hit ratios, conversion rates, etc.',
    }),
    replaces: i18n.translate('xpack.alertingV2.ruleBuilders.rateRatio.replaces', {
      defaultMessage: 'APM error rate, Transaction error rate',
    }),
    iconType: 'percent',
  },
  {
    id: 'event_rate',
    title: i18n.translate('xpack.alertingV2.ruleBuilders.eventRate.title', {
      defaultMessage: 'Event Rate',
    }),
    description: i18n.translate('xpack.alertingV2.ruleBuilders.eventRate.description', {
      defaultMessage:
        'Alert when the volume of events exceeds a threshold. Simple count-based monitoring per time unit.',
    }),
    replaces: i18n.translate('xpack.alertingV2.ruleBuilders.eventRate.replaces', {
      defaultMessage: 'Log threshold (document count)',
    }),
    iconType: 'document',
  },
  {
    id: 'counter_rate',
    title: i18n.translate('xpack.alertingV2.ruleBuilders.counterRate.title', {
      defaultMessage: 'Counter Rate',
    }),
    description: i18n.translate('xpack.alertingV2.ruleBuilders.counterRate.description', {
      defaultMessage:
        'Alert on the rate of change of a counter metric. Pod restarts, network bytes, request counts — uses ES|QL TS command with rate().',
    }),
    replaces: i18n.translate('xpack.alertingV2.ruleBuilders.counterRate.replaces', {
      defaultMessage: 'Custom threshold (counter metrics)',
    }),
    iconType: 'metric',
    badge: 'requires_tsdb',
  },
];

export const getBuildersForDisplay = (
  mode: 'featured' | 'all',
  featuredIds: RuleBuilderId[] = FEATURED_RULE_BUILDER_IDS
): RuleBuilderDefinition[] => {
  if (mode === 'all') {
    return RULE_BUILDERS;
  }
  const idSet = new Set(featuredIds);
  return RULE_BUILDERS.filter((b) => idSet.has(b.id));
};

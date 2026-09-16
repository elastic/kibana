/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleEventEnrichment, RuleEventEnrichmentInput } from '@kbn/alerting-v2-rule-builders';
import type { DetectionRuleCommonFields } from './detection_rule_common_fields';

/**
 * Shared enrichment helper registered by both POC detection rule types
 * (`security.detection.query` and `security.detection.threshold`).
 *
 * Stamps three values on every breached event:
 * - `severity` from the rule's fields (wins over any `severity` output column)
 * - `kibana.alert.risk_score` in `data`, from the rule's `risk_score` field
 * - `kibana.alert.rule.rule_id` in `data`, from `rule.signature_id`
 *
 * The field names inside `data` reuse v1's alert field names verbatim as
 * deliberate placeholders; the final names are owned by the detection-alerts
 * track.  Do not rename them here.
 *
 * Pure and synchronous — no I/O, no side effects.
 */
export const enrichDetectionRuleEvent = ({
  fields,
  rule,
}: RuleEventEnrichmentInput<DetectionRuleCommonFields>): RuleEventEnrichment => ({
  severity: fields.severity,
  data: {
    'kibana.alert.risk_score': fields.risk_score,
    'kibana.alert.rule.rule_id': rule.signature_id,
  },
});

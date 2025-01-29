/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import type { AlertRule, AlertRuleData } from '../types';
import { UntypedNormalizedRuleType } from '../../rule_type_registry';

interface FormatRuleOpts {
  rule: AlertRuleData;
  ruleType: UntypedNormalizedRuleType;
}

export const formatRule = ({ rule, ruleType }: FormatRuleOpts): AlertRule => {
  return {
    [ALERT_RULE_CATEGORY]: ruleType.name,
    [ALERT_RULE_CONSUMER]: rule.consumer,
    [ALERT_RULE_EXECUTION_UUID]: rule.executionId,
    [ALERT_RULE_NAME]: rule.name,
    [ALERT_RULE_PARAMETERS]: rule.parameters,
    [ALERT_RULE_PRODUCER]: ruleType.producer,
    [ALERT_RULE_REVISION]: rule.revision,
    [ALERT_RULE_TYPE_ID]: ruleType.id,
    [ALERT_RULE_TAGS]: rule.tags,
    [ALERT_RULE_UUID]: rule.id,
    [SPACE_IDS]: [rule.spaceId],
  };
};

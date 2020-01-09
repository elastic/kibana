/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from '../../../../../alerting';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { isAlertType } from '../rules/types';
import { readRules } from './read_rules';
import { transformRulesToNdjson, transformAlertToRule } from '../routes/rules/utils';
import { OutputRuleAlertRest } from '../types';

export interface RulesErrors {
  missingRules: Array<{ rule_id: string }>;
  rules: Array<Partial<OutputRuleAlertRest>>;
}

export const getExportByObjectIds = async (
  alertsClient: AlertsClient,
  objects: Array<{ rule_id: string }>
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
}> => {
  const rulesAndErrors = await getRulesFromObjects(alertsClient, objects);
  const rulesNdjson = transformRulesToNdjson(rulesAndErrors.rules);
  const exportDetails = getExportDetailsNdjson(rulesAndErrors.rules, rulesAndErrors.missingRules);
  return { rulesNdjson, exportDetails };
};

export const getRulesFromObjects = async (
  alertsClient: AlertsClient,
  objects: Array<{ rule_id: string }>
): Promise<RulesErrors> => {
  const alertsAndErrors = await objects.reduce<Promise<RulesErrors>>(
    async (accumPromise, object) => {
      const accum = await accumPromise;
      const rule = await readRules({ alertsClient, ruleId: object.rule_id });
      if (rule != null && isAlertType(rule) && rule.params.immutable !== true) {
        const transformedRule = transformAlertToRule(rule);
        return {
          missingRules: accum.missingRules,
          rules: [...accum.rules, transformedRule],
        };
      } else {
        return {
          missingRules: [...accum.missingRules, { rule_id: object.rule_id }],
          rules: accum.rules,
        };
      }
    },
    Promise.resolve({
      exportedCount: 0,
      missingRules: [],
      rules: [],
    })
  );
  return alertsAndErrors;
};

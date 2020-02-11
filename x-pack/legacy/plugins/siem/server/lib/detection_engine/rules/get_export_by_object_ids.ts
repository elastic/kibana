/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from '../../../../../../../plugins/alerting/server';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { isAlertType } from '../rules/types';
import { readRules } from './read_rules';
import { transformRulesToNdjson, transformAlertToRule } from '../routes/rules/utils';
import { OutputRuleAlertRest } from '../types';

interface ExportSuccesRule {
  statusCode: 200;
  rule: Partial<OutputRuleAlertRest>;
}

interface ExportFailedRule {
  statusCode: 404;
  missingRuleId: { rule_id: string };
}

type ExportRules = ExportSuccesRule | ExportFailedRule;

export interface RulesErrors {
  exportedCount: number;
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
  const alertsAndErrors = await Promise.all(
    objects.reduce<Array<Promise<ExportRules>>>((accumPromise, object) => {
      const exportWorkerPromise = new Promise<ExportRules>(async resolve => {
        try {
          const rule = await readRules({ alertsClient, ruleId: object.rule_id });
          if (rule != null && isAlertType(rule) && rule.params.immutable !== true) {
            const transformedRule = transformAlertToRule(rule);
            resolve({
              statusCode: 200,
              rule: transformedRule,
            });
          } else {
            resolve({
              statusCode: 404,
              missingRuleId: { rule_id: object.rule_id },
            });
          }
        } catch {
          resolve({
            statusCode: 404,
            missingRuleId: { rule_id: object.rule_id },
          });
        }
      });
      return [...accumPromise, exportWorkerPromise];
    }, [])
  );

  const missingRules = alertsAndErrors.filter(
    resp => resp.statusCode === 404
  ) as ExportFailedRule[];
  const exportedRules = alertsAndErrors.filter(
    resp => resp.statusCode === 200
  ) as ExportSuccesRule[];

  return {
    exportedCount: exportedRules.length,
    missingRules: missingRules.map(mr => mr.missingRuleId),
    rules: exportedRules.map(er => er.rule),
  };
};

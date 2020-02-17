/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from '../../../../../alerting';
import { getNonPackagedRules } from './get_existing_prepackaged_rules';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { transformAlertsToRules, transformRulesToNdjson } from '../routes/rules/utils';

export const getExportAll = async (
  alertsClient: AlertsClient
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
}> => {
  const ruleAlertTypes = await getNonPackagedRules({ alertsClient });
  const rules = transformAlertsToRules(ruleAlertTypes);
  const rulesNdjson = transformRulesToNdjson(rules);
  const exportDetails = getExportDetailsNdjson(rules);
  return { rulesNdjson, exportDetails };
};

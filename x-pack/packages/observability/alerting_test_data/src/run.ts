/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApmRule } from './create_apm_rule';
import { createCustomThresholdRule } from './create_custom_threshold_rule';
import { createDataView } from './create_data_view';
import { createIndexConnector } from './create_index_connector';
import { getKibanaUrl } from './get_kibana_url';

import { scenario1, scenario2, scenario3, scenario4, scenario5, scenario6, apm_error_count, apm_transaction_rate, apm_error_count_AIAssistant, apm_transaction_rate_AIAssistant, custom_threshold_AIAssistant_log_count, custom_threshold_AIAssistant_metric_avg } from './scenarios';

const scenarios_custom_threshold = [
  // Logs use-cases
  scenario1,
  scenario2,
  scenario3,
  // Metrics use-cases
  scenario4,
  scenario5,
  scenario6,
  // AI Assistant Use Cases
  custom_threshold_AIAssistant_log_count,
  custom_threshold_AIAssistant_metric_avg
];

const scenarios_apm = [
  apm_error_count,
  apm_transaction_rate,
  // AI Assistant Use Cases
  apm_error_count_AIAssistant,
  apm_transaction_rate_AIAssistant
];

/* eslint-disable no-console */
export async function run(kibanaUrlAuth?: string) {
  const kibanaUrl = kibanaUrlAuth || await getKibanaUrl()
  console.log('Creating index connector - start');
  const response = await createIndexConnector(kibanaUrl);
  const actionId = await response.data.id;
  console.log('Creating index connector - finished - actionId: ', actionId);
  for (const scenario of scenarios_custom_threshold) {
    if (scenario.ruleParams.ruleTypeId.includes("custom_threshold")) {
      if (scenario.dataView.shouldCreate) {
        console.log('Creating data view - start - id: ', scenario.dataView.id);
        await createDataView(kibanaUrl, scenario.dataView);
        console.log('Creating data view - finished - id: ', scenario.dataView.id);
      }
      console.log('Creating Custom threshold rule - start - name: ', scenario.ruleParams.name);
      await createCustomThresholdRule(kibanaUrl, actionId, scenario.dataView.id, scenario.ruleParams);
      console.log('Creating Custom threshold rule - finished - name: ', scenario.ruleParams.name);
    }
  }
  for (const scenario of scenarios_apm) {
    console.log(`Creating APM ${scenario.ruleParams.ruleTypeId} rule - start - name: ${scenario.ruleParams.name}`,);
    await createApmRule(kibanaUrl, actionId, scenario.ruleParams);
    console.log(`Creating APM ${scenario.ruleParams.ruleTypeId} rule - start - name: ${scenario.ruleParams.name} finished`);
  }
}

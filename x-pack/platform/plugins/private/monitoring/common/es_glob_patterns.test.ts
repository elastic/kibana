/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESGlobPatterns } from './es_glob_patterns';

const testIndices = [
  '.kibana_task_manager_inifc_1',
  '.kibana_shahzad_4',
  '.kibana_shahzad_3',
  '.kibana_shahzad_2',
  '.kibana_shahzad_1',
  '.kibana_task_manager_cmarcondes-24_8.0.0_001',
  '.kibana_task_manager_custom_kbn-pr93025_8.0.0_001',
  '.kibana_task_manager_spong_8.0.0_001',
  '.ds-metrics-system.process.summary-default-2021.05.25-00000',
  '.kibana_shahzad_9',
  '.kibana-felix-log-stream_8.0.0_001',
  '.kibana_smith_alerts-observability.apm.alerts-000001',
  '.ds-logs-endpoint.events.process-default-2021.05.26-000001',
  '.kibana_dominiqueclarke54_8.0.0_001',
  '.kibana-cmarcondes-19_8.0.0_001',
  '.kibana_task_manager_cmarcondes-17_8.0.0_001',
  '.kibana_task_manager_jrhodes_8.0.0_001',
  '.kibana_task_manager_dominiqueclarke7_8',
  'data_prod_0',
  'data_prod_1',
  'data_prod_2',
  'data_prod_3',
  'filebeat-8.0.0-2021.04.13-000001',
  '.kibana_dominiqueclarke55-alerts-8.0.0-000001',
  '.ds-metrics-system.socket_summary-default-2021.05.12-000001',
  '.kibana_task_manager_dominiqueclarke24_8.0.0_001',
  '.kibana_custom_kbn-pr94906_8.0.0_001',
  '.kibana_task_manager_cmarcondes-22_8.0.0_001',
  '.kibana_dominiqueclarke49-event-log-8.0.0-000001',
  'data_stage_2',
  'data_stage_3',
].sort();

const noSystemIndices = [
  'data_prod_0',
  'data_prod_1',
  'data_prod_2',
  'data_prod_3',
  'filebeat-8.0.0-2021.04.13-000001',
  'data_stage_2',
  'data_stage_3',
].sort();

const onlySystemIndices = [
  '.kibana_task_manager_inifc_1',
  '.kibana_shahzad_4',
  '.kibana_shahzad_3',
  '.kibana_shahzad_2',
  '.kibana_shahzad_1',
  '.kibana_task_manager_cmarcondes-24_8.0.0_001',
  '.kibana_task_manager_custom_kbn-pr93025_8.0.0_001',
  '.kibana_task_manager_spong_8.0.0_001',
  '.ds-metrics-system.process.summary-default-2021.05.25-00000',
  '.kibana_shahzad_9',
  '.kibana-felix-log-stream_8.0.0_001',
  '.kibana_smith_alerts-observability.apm.alerts-000001',
  '.ds-logs-endpoint.events.process-default-2021.05.26-000001',
  '.kibana_dominiqueclarke54_8.0.0_001',
  '.kibana-cmarcondes-19_8.0.0_001',
  '.kibana_task_manager_cmarcondes-17_8.0.0_001',
  '.kibana_task_manager_jrhodes_8.0.0_001',
  '.kibana_task_manager_dominiqueclarke7_8',
  '.kibana_dominiqueclarke55-alerts-8.0.0-000001',
  '.ds-metrics-system.socket_summary-default-2021.05.12-000001',
  '.kibana_task_manager_dominiqueclarke24_8.0.0_001',
  '.kibana_custom_kbn-pr94906_8.0.0_001',
  '.kibana_task_manager_cmarcondes-22_8.0.0_001',
  '.kibana_dominiqueclarke49-event-log-8.0.0-000001',
].sort();

const kibanaNoTaskIndices = [
  '.kibana_shahzad_4',
  '.kibana_shahzad_3',
  '.kibana_shahzad_2',
  '.kibana_shahzad_1',
  '.kibana_shahzad_9',
  '.kibana-felix-log-stream_8.0.0_001',
  '.kibana_smith_alerts-observability.apm.alerts-000001',
  '.kibana_dominiqueclarke54_8.0.0_001',
  '.kibana-cmarcondes-19_8.0.0_001',
  '.kibana_dominiqueclarke55-alerts-8.0.0-000001',
  '.kibana_custom_kbn-pr94906_8.0.0_001',
  '.kibana_dominiqueclarke49-event-log-8.0.0-000001',
].sort();

describe('ES glob index patterns', () => {
  it('should exclude system/internal indices', () => {
    const validIndexPatterns = ESGlobPatterns.createRegExPatterns('-.*');
    const validIndices = testIndices.filter((index) =>
      ESGlobPatterns.isValid(index, validIndexPatterns)
    );
    expect(validIndices.sort()).toEqual(noSystemIndices);
  });

  it('should only show ".index" system indices', () => {
    const validIndexPatterns = ESGlobPatterns.createRegExPatterns('.*');
    const validIndices = testIndices.filter((index) =>
      ESGlobPatterns.isValid(index, validIndexPatterns)
    );
    expect(validIndices.sort()).toEqual(onlySystemIndices);
  });

  it('should only show ".kibana*" indices without _task_', () => {
    const validIndexPatterns = ESGlobPatterns.createRegExPatterns('.kibana*,-*_task_*');
    const validIndices = testIndices.filter((index) =>
      ESGlobPatterns.isValid(index, validIndexPatterns)
    );
    expect(validIndices.sort()).toEqual(kibanaNoTaskIndices);
  });
});

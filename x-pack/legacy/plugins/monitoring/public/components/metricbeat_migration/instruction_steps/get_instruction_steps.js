/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getKibanaInstructionsForEnablingMetricbeat,
  getKibanaInstructionsForDisablingInternalCollection,
} from './kibana';
import {
  getElasticsearchInstructionsForEnablingMetricbeat,
  getElasticsearchInstructionsForDisablingInternalCollection
} from './elasticsearch';
import {
  getLogstashInstructionsForEnablingMetricbeat,
  getLogstashInstructionsForDisablingInternalCollection,
} from './logstash';
import {
  INSTRUCTION_STEP_ENABLE_METRICBEAT,
  INSTRUCTION_STEP_DISABLE_INTERNAL
} from '../constants';
import { ELASTICSEARCH_CUSTOM_ID } from '../../../../common/constants';
import { KIBANA_SYSTEM_ID, LOGSTASH_SYSTEM_ID } from '../../../../../telemetry/common/constants';

export function getInstructionSteps(productName, product, step, meta, opts) {
  switch (productName) {
    case KIBANA_SYSTEM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getKibanaInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getKibanaInstructionsForDisablingInternalCollection(product, meta, opts);
      }
    case ELASTICSEARCH_CUSTOM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getElasticsearchInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getElasticsearchInstructionsForDisablingInternalCollection(product, meta, opts);
      }
    case LOGSTASH_SYSTEM_ID:
      if (step === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        return getLogstashInstructionsForEnablingMetricbeat(product, meta, opts);
      }
      if (step === INSTRUCTION_STEP_DISABLE_INTERNAL) {
        return getLogstashInstructionsForDisablingInternalCollection(product, meta, opts);
      }
  }
  return [];
}

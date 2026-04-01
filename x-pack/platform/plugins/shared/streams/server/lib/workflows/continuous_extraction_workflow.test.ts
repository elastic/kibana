/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KI_SELECT_STREAMS_STEP_TYPE,
  COORDINATOR_INTERVAL_MINUTES,
  MAX_SCHEDULED_STREAMS,
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  POLL_DELAY_SECONDS,
  MAX_POLL_ITERATIONS,
} from '../../../common/constants';
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';

const assertYamlContains = (expected: string) => {
  expect(WORKFLOW_YAML).toContain(expected);
};

describe('continuous_extraction_workflow.yaml stays in sync with constants', () => {
  it('uses the correct step type', () => {
    assertYamlContains(KI_SELECT_STREAMS_STEP_TYPE);
  });

  it('uses the correct timeout', () => {
    assertYamlContains(`timeout: "${COORDINATOR_INTERVAL_MINUTES - 1}m"`);
  });

  it('uses the correct coordinator interval', () => {
    assertYamlContains(`every: "${COORDINATOR_INTERVAL_MINUTES}m"`);
  });

  it('uses the correct maxScheduledStreams input', () => {
    assertYamlContains(
      `name: maxScheduledStreams\n    type: number\n    default: ${MAX_SCHEDULED_STREAMS}`
    );
  });

  it('uses the correct lookbackHours input', () => {
    assertYamlContains(`name: lookbackHours\n    type: number\n    default: 24`);
  });

  it('uses the correct extractionIntervalHours input', () => {
    assertYamlContains(
      `name: extractionIntervalHours\n    type: number\n    default: ${DEFAULT_EXTRACTION_INTERVAL_HOURS}`
    );
  });

  it('uses the correct max poll iterations', () => {
    assertYamlContains(`max-iterations: ${MAX_POLL_ITERATIONS}`);
  });

  it('uses the correct poll delay duration', () => {
    assertYamlContains(`duration: "${POLL_DELAY_SECONDS}s"`);
  });
});

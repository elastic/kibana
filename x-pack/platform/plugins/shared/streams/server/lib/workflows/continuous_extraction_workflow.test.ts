/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COORDINATOR_INTERVAL_MINUTES,
  MAX_SCHEDULED_STREAMS,
  POLL_DELAY_SECONDS,
} from '../../../common/constants';
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';

const assertYamlContains = (expected: string) => {
  expect(WORKFLOW_YAML).toContain(expected);
};

describe('continuous_extraction_workflow.yaml stays in sync with constants', () => {
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

  it('declares extractionIntervalHours as an optional input without default', () => {
    assertYamlContains('name: extractionIntervalHours\n    type: number\n    description:');
    expect(WORKFLOW_YAML).not.toMatch(/name: extractionIntervalHours[\s\S]*?default:/m);
  });

  it('declares excludedStreamPatterns as an optional input without default', () => {
    assertYamlContains('name: excludedStreamPatterns\n    type: string\n    description:');
    expect(WORKFLOW_YAML).not.toMatch(/name: excludedStreamPatterns[\s\S]*?default:/m);
  });

  it('uses the correct poll delay duration', () => {
    assertYamlContains(`duration: "${POLL_DELAY_SECONDS}s"`);
  });

  it('calls the eligibility endpoint with the correct query params', () => {
    assertYamlContains('_extraction/_eligible');
    assertYamlContains('maxScheduledStreams={{ inputs.maxScheduledStreams }}');
    assertYamlContains('lookbackHours={{ inputs.lookbackHours }}');
    assertYamlContains(
      '{%- if inputs.extractionIntervalHours %}&extractionIntervalHours={{ inputs.extractionIntervalHours }}{% endif -%}'
    );
    assertYamlContains(
      '{%- if inputs.excludedStreamPatterns %}&excludedStreamPatterns={{ inputs.excludedStreamPatterns }}{% endif -%}'
    );
  });

  it('calls the task scheduling endpoint', () => {
    assertYamlContains('features/_task');
  });
});

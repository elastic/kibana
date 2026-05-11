/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getManagedWorkflowDefinition,
  STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { COORDINATOR_INTERVAL_MINUTES, MAX_SCHEDULED_STREAMS } from '../../../common/constants';

const definition = getManagedWorkflowDefinition(STREAMS_KI_CONTINUOUS_EXTRACTION_WORKFLOW_ID);

const assertYamlContains = (expected: string) => {
  expect(definition?.yaml).toContain(expected);
};

describe('continuous_extraction_workflow.yaml stays in sync with constants', () => {
  it('is registered as a managed workflow definition', () => {
    expect(definition).toBeDefined();
    expect(definition?.pluginId).toBe('streams');
    expect(definition?.management.enablement).toBe('restorable');
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

  it('declares extractionIntervalHours as an optional input without default', () => {
    assertYamlContains('name: extractionIntervalHours\n    type: number\n    description:');
    expect(definition?.yaml).not.toMatch(/name: extractionIntervalHours[\s\S]*?default:/m);
  });

  it('declares excludedStreamPatterns as an optional input without default', () => {
    assertYamlContains('name: excludedStreamPatterns\n    type: string\n    description:');
    expect(definition?.yaml).not.toMatch(/name: excludedStreamPatterns[\s\S]*?default:/m);
  });

  it('calls the eligibility endpoint with the correct query params', () => {
    assertYamlContains('_extraction/_eligible');
    assertYamlContains('maxScheduledStreams={{ inputs.maxScheduledStreams }}');
    assertYamlContains('lookbackHours={{ inputs.lookbackHours }}');
    assertYamlContains(
      '{%- if inputs.extractionIntervalHours != null %}&extractionIntervalHours={{ inputs.extractionIntervalHours }}{% endif -%}'
    );
    assertYamlContains(
      '{%- if inputs.excludedStreamPatterns %}&excludedStreamPatterns={{ inputs.excludedStreamPatterns }}{% endif -%}'
    );
  });

  it('launches the onboarding subworkflow asynchronously by UUID with skipQueries', () => {
    assertYamlContains('type: workflow.executeAsync');
    assertYamlContains(`workflow-id: "${STREAMS_KI_ONBOARDING_WORKFLOW_ID}"`);
    assertYamlContains('skipQueries: true');
  });

  it('polls each stream execution via the _execution endpoint', () => {
    assertYamlContains('/onboarding/_execution');
  });

  it('passes the resolved intervalHours from _eligible to the onboarding workflow', () => {
    assertYamlContains(
      'featuresRecencyThresholdHours: "${{ steps.get_eligible.output.resolvedIntervalHours }}"'
    );
  });

  it('defaults to enabled: false so the workflow starts dormant', () => {
    assertYamlContains('enabled: false');
  });
});

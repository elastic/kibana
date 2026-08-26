/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

// The KI sync workflow YAML lives in the managed workflow definition
// (kbn-workflows/managed/definitions/significant_events/knowledge_indicators/sync.yaml).
// These tests keep that YAML in sync with the significant_events constants.
const definition = getManagedWorkflowDefinition(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID);

const getWorkflowYaml = (): string => {
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error('KI sync managed workflow definition is missing inline YAML');
  }
  return definition.yaml;
};

const WORKFLOW_YAML = getWorkflowYaml();

const assertYamlContains = (expected: string) => {
  expect(WORKFLOW_YAML).toContain(expected);
};

describe('sync.yaml managed workflow definition', () => {
  it('is registered as a restorable managed workflow', () => {
    expect(definition?.management.enablement).toBe('restorable');
  });

  it('is disabled by default so SyncWorkflowService controls enablement', () => {
    assertYamlContains('enabled: false');
  });

  it('drops overlapping runs via a single-instance concurrency key', () => {
    assertYamlContains('key: significant-events-ki-sync');
    assertYamlContains('strategy: drop');
    assertYamlContains('max: 1');
  });

  it('lists streams from the _streams_with_indicators endpoint', () => {
    assertYamlContains('/internal/streams/_knowledge_indicators/_streams_with_indicators');
  });

  it('fans out over streams and reconciles each one', () => {
    assertYamlContains("foreach: '${{ steps.get_streams.output.streams }}'");
    assertYamlContains(
      '/internal/streams/{{ foreach.item.streamName }}/knowledge_indicators/_reconcile'
    );
  });

  it('continues the sweep when a single stream fails to reconcile', () => {
    assertYamlContains('iteration-on-failure:\n          continue: true');
  });
});

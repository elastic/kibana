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

const definition = getManagedWorkflowDefinition(SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID);
const workflowYaml =
  definition && 'yaml' in definition && typeof definition.yaml === 'string' ? definition.yaml : '';

describe('KI sync managed workflow definition', () => {
  it('is a static, restorable workflow that only reconciles KIs', () => {
    expect(definition?.management).toEqual({
      lifecycle: 'static',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
    expect(workflowYaml).toContain(
      '/internal/streams/_knowledge_indicators/_streams_with_indicators'
    );
    expect(workflowYaml).toContain(
      '/internal/streams/{{ foreach.item.streamName }}/knowledge_indicators/_reconcile'
    );
    expect(workflowYaml).not.toContain('significant_events/events/_cleanup');
  });
});

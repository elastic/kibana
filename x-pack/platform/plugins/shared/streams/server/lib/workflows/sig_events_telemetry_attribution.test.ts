/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import {
  STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
} from '@kbn/streams-schema';
import {
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';

interface AgentStep {
  type?: string;
  'plugin-id'?: string;
  'aggregate-by'?: string;
}

const collectAgentSteps = (node: unknown, acc: AgentStep[] = []): AgentStep[] => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectAgentSteps(child, acc));
  } else if (node !== null && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (record.type === 'ai.agent') {
      acc.push(record as AgentStep);
    }
    Object.values(record).forEach((value) => collectAgentSteps(value, acc));
  }
  return acc;
};

const getAgentSteps = (workflowId: string): AgentStep[] => {
  const definition = getManagedWorkflowDefinition(workflowId);
  if (!definition || typeof definition.yaml !== 'string') {
    throw new Error(`Expected managed workflow "${workflowId}" to expose static yaml`);
  }
  return collectAgentSteps(parse(definition.yaml));
};

// The managed workflow YAMLs hardcode the connector-telemetry feature ids because they can't
// import the @kbn/streams-schema constants. This guards against the hardcoded values drifting
// from the source of truth in inference_feature_ids.ts.
describe('significant events workflow telemetry attribution', () => {
  it.each([
    ['discovery', SIGEVENTS_DISCOVERY_WORKFLOW_ID],
    ['triage', SIGEVENTS_TRIAGE_WORKFLOW_ID],
  ])(
    'tags the %s ai.agent step with the @kbn/streams-schema feature ids',
    (_workflowName, workflowId) => {
      const agentSteps = getAgentSteps(workflowId);

      expect(agentSteps.length).toBeGreaterThan(0);
      agentSteps.forEach((step) => {
        expect(step['plugin-id']).toBe(STREAMS_SIG_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID);
        expect(step['aggregate-by']).toBe(STREAMS_SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID);
      });
    }
  );
});

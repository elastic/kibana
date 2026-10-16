/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows/spec/schema';
import { parseWorkflowYamlToJSON, parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import { EvaluateTraceStepId, PersistOnlineScoresStepId } from '../workflows/steps';
import {
  buildOnlineEvalWorkflowYaml,
  parseOnlineEvalWorkflowYaml,
  type OnlineEvalWorkflowConfig,
} from './workflow_yaml';

const CURRENT_TRACE_FILTER_LINE =
  '| WHERE parent_span_id IS NULL AND KQL("attributes.gen_ai.operation.name:*") AND NOT KQL("attributes.evaluator.name:*")';

const getConfig = (): OnlineEvalWorkflowConfig => ({
  name: 'My online monitor',
  indexPattern: 'traces-agent_builder.otel-default',
  extraEsqlWhere: "attributes.agent_id == 'agent-1'",
  windowMinutes: 45,
  lagMinutes: 15,
  maxTracesPerRun: 25,
  every: '1h',
  evaluators: [{ name: 'correctness', version: 'v1' }, { name: 'trace_readiness' }],
  connectorId: 'connector-123',
});

describe('online eval workflow yaml', () => {
  it('builds a workflow yaml snapshot and validates against WorkflowSchema', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig());

    expect(yaml).toMatchSnapshot();

    const parsed = parseWorkflowYamlToJSON(yaml, WorkflowSchema);
    expect(parsed.success).toBe(true);
  });

  it('round-trips generated yaml back to the online eval config', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config);

    expect(parseOnlineEvalWorkflowYaml(yaml)).toEqual(config);
  });

  it('parses v1 trace filter workflows (evaluator exclusion only)', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config).replace(
      CURRENT_TRACE_FILTER_LINE,
      '| WHERE parent_span_id IS NULL AND attributes.evaluator.name IS NULL'
    );

    expect(parseOnlineEvalWorkflowYaml(yaml)).toEqual(config);
  });

  it('parses interim trace filter workflows (bare attributes.* column references)', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config).replace(
      CURRENT_TRACE_FILTER_LINE,
      '| WHERE parent_span_id IS NULL AND attributes.evaluator.name IS NULL AND attributes.gen_ai.operation.name IS NOT NULL'
    );

    expect(parseOnlineEvalWorkflowYaml(yaml)).toEqual(config);
  });

  it('does not reference dynamic attributes.* fields as bare ES|QL columns in the trace filter', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig());

    expect(yaml).toContain(CURRENT_TRACE_FILTER_LINE);
    expect(yaml).not.toContain('attributes.evaluator.name IS NULL');
  });

  it('uses the typed evals steps instead of raw kibana.request calls', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig());

    expect(yaml).toContain(`type: ${EvaluateTraceStepId}`);
    expect(yaml).toContain(`type: ${PersistOnlineScoresStepId}`);
    expect(yaml).not.toContain('kibana.request');
    expect(yaml).not.toContain('kbn-xsrf');
    expect(yaml).not.toContain('elastic-api-version');
    expect(yaml).not.toContain('x-elastic-internal-origin');
    expect(yaml).not.toMatch(/[&*]a\d/);
  });

  it('retries both steps with backoff and skips a trace whose retries are exhausted', () => {
    // The static `WorkflowSchema` doesn't know the evals step types, so inspect the raw YAML.
    const parsed = parseYamlToJSONWithoutValidation(buildOnlineEvalWorkflowYaml(getConfig()));
    if (!parsed.success) {
      throw new Error('Expected the generated workflow to be valid YAML');
    }

    const [, evaluateEach] = (parsed.json as { steps: Array<Record<string, unknown>> }).steps;
    expect(evaluateEach['iteration-on-failure']).toEqual({ continue: true });

    const expectedRetry = {
      'max-attempts': 3,
      delay: '5s',
      strategy: 'exponential',
      'max-delay': '1m',
      jitter: true,
    };
    for (const step of evaluateEach.steps as Array<Record<string, unknown>>) {
      expect(step['on-failure']).toEqual({ retry: expectedRetry });
    }
  });

  it('does not parse workflows that still use raw kibana.request steps', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig()).replace(
      `type: ${PersistOnlineScoresStepId}`,
      'type: kibana.request'
    );

    expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
  });

  it('returns undefined for non-online-evals workflows', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config).replace('evals-online', 'not-online');

    expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowSchema } from '@kbn/workflows/spec/schema';
import { parseWorkflowYamlToJSON } from '@kbn/workflows-yaml';
import {
  buildOnlineEvalWorkflowYaml,
  isLegacyOnlineEvalWorkflowYaml,
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

  it('targets the workflow space for the evaluate and persist steps', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig());

    expect(yaml).toContain('path: /s/{{ workflow.spaceId }}/internal/evals/_evaluate');
    expect(yaml).toContain('path: /s/{{ workflow.spaceId }}/internal/evals/online_scores');
  });

  it('parses legacy workflows whose step paths have no space prefix', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config).replaceAll('/s/{{ workflow.spaceId }}', '');

    expect(yaml).toContain('path: /internal/evals/_evaluate');
    expect(parseOnlineEvalWorkflowYaml(yaml)).toEqual(config);
  });

  it('flags only online eval workflows whose step paths have no space prefix as legacy', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig());
    const legacyYaml = yaml.replaceAll('/s/{{ workflow.spaceId }}', '');

    expect(isLegacyOnlineEvalWorkflowYaml(yaml)).toBe(false);
    expect(isLegacyOnlineEvalWorkflowYaml(legacyYaml)).toBe(true);
    expect(isLegacyOnlineEvalWorkflowYaml(legacyYaml.replace('evals-online', 'not-online'))).toBe(
      false
    );
  });

  it('returns undefined for non-online-evals workflows', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config).replace('evals-online', 'not-online');

    expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
  });
});

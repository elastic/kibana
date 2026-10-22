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
  parseOnlineEvalWorkflowYaml,
  type OnlineEvalWorkflowConfig,
} from './workflow_yaml';

const CURRENT_TRACE_FILTER_LINE =
  '| WHERE parent_span_id IS NULL AND KQL("attributes.gen_ai.operation.name:*") AND NOT KQL("attributes.evaluator.name:*")';

const getConfig = (): OnlineEvalWorkflowConfig => ({
  name: 'My online monitor',
  resultSink: 'data_stream',
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

  it('builds an OTel events workflow yaml snapshot and validates against WorkflowSchema', () => {
    const yaml = buildOnlineEvalWorkflowYaml({ ...getConfig(), resultSink: 'otel_events' });

    expect(yaml).toMatchSnapshot();

    const parsed = parseWorkflowYamlToJSON(yaml, WorkflowSchema);
    expect(parsed.success).toBe(true);
  });

  it('round-trips generated yaml back to the online eval config', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config);

    expect(parseOnlineEvalWorkflowYaml(yaml)).toEqual(config);
  });

  it('round-trips generated OTel events yaml back to the online eval config', () => {
    const config: OnlineEvalWorkflowConfig = { ...getConfig(), resultSink: 'otel_events' };
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

  it('emits OTel events from the evaluate step and has no persist step', () => {
    const yaml = buildOnlineEvalWorkflowYaml({ ...getConfig(), resultSink: 'otel_events' });

    expect(yaml).toContain(
      [
        '            emit:',
        '              monitor:',
        '                id: "{{ workflow.id }}"',
        '                name: "{{ workflow.name }}"',
      ].join('\n')
    );
    expect(yaml).not.toContain('name: persist');
    expect(yaml).not.toContain('online_evaluation_events');
    expect(yaml).not.toContain('span_id:');
    expect(yaml).not.toContain('BY trace_id, span_id');
    expect(yaml).toContain('| STATS latest = MAX(@timestamp) BY trace_id\n');
  });

  it('does not parse an OTel events workflow whose emit block targets another monitor', () => {
    const yaml = buildOnlineEvalWorkflowYaml({ ...getConfig(), resultSink: 'otel_events' }).replace(
      '                id: "{{ workflow.id }}"',
      '                id: other-monitor'
    );

    expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
  });

  it('does not parse an OTel events workflow that also has a persist step', () => {
    const otelYaml = buildOnlineEvalWorkflowYaml({ ...getConfig(), resultSink: 'otel_events' });
    const dataStreamYaml = buildOnlineEvalWorkflowYaml(getConfig());
    const persistStep = dataStreamYaml.slice(dataStreamYaml.indexOf('      - name: persist'));

    expect(parseOnlineEvalWorkflowYaml(`${otelYaml}${persistStep}`)).toBeUndefined();
  });

  describe('legacy OTel events workflows (separate events route)', () => {
    const buildLegacyYaml = () =>
      buildOnlineEvalWorkflowYaml(getConfig())
        .replace(
          '| STATS latest = MAX(@timestamp) BY trace_id\n',
          '| STATS latest = MAX(@timestamp) BY trace_id, span_id\n'
        )
        .replace('| KEEP latest, trace_id\n', '| KEEP latest, trace_id, span_id\n')
        .replace(
          'path: /s/{{ workflow.spaceId }}/internal/evals/online_scores',
          'path: /s/{{ workflow.spaceId }}/internal/evals/online_evaluation_events'
        )
        .replace(
          '            trace_id: "{{ foreach.item[1] }}"\n            connector_id',
          '            trace_id: "{{ foreach.item[1] }}"\n            span_id: "{{ foreach.item[2] }}"\n            connector_id'
        );

    it('parses them as the otel_events sink', () => {
      expect(parseOnlineEvalWorkflowYaml(buildLegacyYaml())).toEqual({
        ...getConfig(),
        resultSink: 'otel_events',
      });
    });

    it('upgrades them to evaluate-side emission when rebuilt', () => {
      const config = parseOnlineEvalWorkflowYaml(buildLegacyYaml());
      if (!config) {
        throw new Error('Expected the legacy workflow to parse');
      }

      expect(buildOnlineEvalWorkflowYaml(config)).toBe(
        buildOnlineEvalWorkflowYaml({ ...getConfig(), resultSink: 'otel_events' })
      );
    });

    it('does not parse them without the evaluated span id', () => {
      const yaml = buildLegacyYaml().replace('            span_id: "{{ foreach.item[2] }}"\n', '');

      expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
    });

    it('does not parse them without span-aware sampling', () => {
      const yaml = buildLegacyYaml().replace(
        '| STATS latest = MAX(@timestamp) BY trace_id, span_id',
        '| STATS latest = MAX(@timestamp) BY trace_id'
      );

      expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
    });
  });

  it('does not parse workflows whose step paths have no space prefix', () => {
    const yaml = buildOnlineEvalWorkflowYaml(getConfig()).replaceAll(
      '/s/{{ workflow.spaceId }}',
      ''
    );

    expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
  });

  it('returns undefined for non-online-evals workflows', () => {
    const config = getConfig();
    const yaml = buildOnlineEvalWorkflowYaml(config).replace('evals-online', 'not-online');

    expect(parseOnlineEvalWorkflowYaml(yaml)).toBeUndefined();
  });
});

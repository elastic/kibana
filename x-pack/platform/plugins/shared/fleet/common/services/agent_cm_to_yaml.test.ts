/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as yaml from 'yaml';

import type { FullAgentConfigMap } from '../types/models/agent_cm';

import { fullAgentConfigMapToYaml } from './agent_cm_to_yaml';

function makeConfigMap(overrides?: Partial<FullAgentConfigMap>): FullAgentConfigMap {
  return {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'agent-node-datastreams',
      namespace: 'kube-system',
      labels: { 'k8s-app': 'elastic-agent' },
    },
    data: {
      'agent.yml': {} as any,
    },
    ...overrides,
  };
}

describe('fullAgentConfigMapToYaml', () => {
  it('serializes a ConfigMap to valid YAML', () => {
    const cm = makeConfigMap();
    const result = fullAgentConfigMapToYaml(cm, yaml);

    const parsed = yaml.parse(result);
    expect(parsed.apiVersion).toBe('v1');
    expect(parsed.kind).toBe('ConfigMap');
    expect(parsed.metadata.name).toBe('agent-node-datastreams');
    expect(parsed.metadata.namespace).toBe('kube-system');
    expect(parsed.metadata.labels['k8s-app']).toBe('elastic-agent');
  });

  it('orders top-level keys as apiVersion, kind, metadata, data', () => {
    // Supply keys in reverse order to confirm sorting is applied
    const cm = {
      data: { 'agent.yml': {} as any },
      metadata: {
        name: 'agent-node-datastreams',
        namespace: 'kube-system',
        labels: { 'k8s-app': 'elastic-agent' },
      },
      kind: 'ConfigMap',
      apiVersion: 'v1',
    } as FullAgentConfigMap;

    const result = fullAgentConfigMapToYaml(cm, yaml);

    const lines = result.split('\n').filter((l) => /^\w/.test(l));
    expect(lines[0]).toMatch(/^apiVersion/);
    expect(lines[1]).toMatch(/^kind/);
    expect(lines[2]).toMatch(/^metadata/);
    expect(lines[3]).toMatch(/^data/);
  });

  it('quotes date-only strings to prevent YAML 1.1 timestamp interpretation by the agent', () => {
    // The Elastic Agent parses policy YAML with a YAML 1.1 parser, which treats unquoted
    // YYYY-MM-DD values as timestamps and converts them to RFC3339 (2021-06-01T00:00:00Z).
    const cm = makeConfigMap({
      data: {
        'agent.yml': {
          state: {
            assessment_api_version: '2021-06-01',
            sub_assessment_api_version: '2019-01-01-preview',
          },
        } as any,
      },
    });

    const result = fullAgentConfigMapToYaml(cm, yaml);

    expect(result).toContain('assessment_api_version: "2021-06-01"');
    expect(result).toContain('sub_assessment_api_version: 2019-01-01-preview');
  });

  it('preserves multi-line strings as YAML literal block scalars (program: |)', () => {
    const program =
      '//   It also says that "The data pipeline ingests data at least every 2\n' +
      '//   minutes." If a package is created every minute on average\n';
    const cm = makeConfigMap({
      data: {
        'agent.yml': {
          inputs: [
            {
              id: 'input-1',
              type: 'cel',
              streams: [{ id: 'stream-1', program }],
            },
          ],
        } as any,
      },
    });

    const result = fullAgentConfigMapToYaml(cm, yaml);

    // Must use literal block style, not folded (>) or double-quoted
    expect(result).toContain('program: |');
    // Lines must be preserved verbatim — no newline-to-space collapse
    expect(result).toContain('every 2\n');
    expect(result).toContain('minutes."');
    expect(result).not.toContain('every 2  //');
  });

  it('preserves nested agent policy data unchanged', () => {
    const cm = makeConfigMap({
      data: {
        'agent.yml': {
          id: 'policy-id',
          outputs: {
            default: { type: 'elasticsearch', hosts: ['http://localhost:9200'] },
          },
          inputs: [{ id: 'input-1', type: 'logfile', streams: [] }],
        } as any,
      },
    });

    const result = fullAgentConfigMapToYaml(cm, yaml);
    const parsed = yaml.parse(result);

    expect(parsed.data['agent.yml'].id).toBe('policy-id');
    expect(parsed.data['agent.yml'].outputs.default.type).toBe('elasticsearch');
    expect(parsed.data['agent.yml'].inputs[0].id).toBe('input-1');
  });
});

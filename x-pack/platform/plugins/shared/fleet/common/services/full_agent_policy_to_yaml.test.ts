/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as yaml from 'yaml';

import type { FullAgentPolicy } from '../types';

import { fullAgentPolicyToYaml } from './full_agent_policy_to_yaml';

// Mock yaml module for testing (matches YamlModule shape)
const mockYaml = {
  Document: class {
    private data: unknown;
    constructor(data: unknown) {
      this.data = data;
    }
    toString() {
      return JSON.stringify(this.data);
    }
  },
  isScalar: () => true,
};

describe('fullAgentPolicyToYaml', () => {
  it('should replace secrets', () => {
    const agentPolicyWithSecrets = {
      id: '1234',
      outputs: { default: { type: 'elasticsearch', hosts: ['http://localhost:9200'] } },
      inputs: [
        {
          id: 'test_input-secrets-abcd1234',
          revision: 1,
          name: 'secrets-1',
          type: 'test_input',
          data_stream: { namespace: 'default' },
          use_output: 'default',
          package_policy_id: 'abcd1234',
          package_var_secret: '$co.elastic.secret{secret-id-1}',
          input_var_secret: '$co.elastic.secret{secret-id-2}',
          streams: [
            {
              id: 'test_input-secrets.log-abcd1234',
              data_stream: { type: 'logs', dataset: 'secrets.log' },
              package_var_secret: '$co.elastic.secret{secret-id-1}',
              input_var_secret: '$co.elastic.secret{secret-id-2}',
              stream_var_secret: '$co.elastic.secret{secret-id-3}',
            },
          ],
          meta: { package: { name: 'secrets', version: '1.0.0' } },
        },
      ],
      secret_references: [{ id: 'secret-id-1' }, { id: 'secret-id-2' }, { id: 'secret-id-3' }],
      revision: 2,
      agent: {},
      signed: {},
      output_permissions: {},
      fleet: {},
    } as unknown as FullAgentPolicy;

    const result = fullAgentPolicyToYaml(agentPolicyWithSecrets, mockYaml);

    expect(result).toMatchInlineSnapshot(
      `"{\\"id\\":\\"1234\\",\\"outputs\\":{\\"default\\":{\\"type\\":\\"elasticsearch\\",\\"hosts\\":[\\"http://localhost:9200\\"]}},\\"inputs\\":[{\\"id\\":\\"test_input-secrets-abcd1234\\",\\"revision\\":1,\\"name\\":\\"secrets-1\\",\\"type\\":\\"test_input\\",\\"data_stream\\":{\\"namespace\\":\\"default\\"},\\"use_output\\":\\"default\\",\\"package_policy_id\\":\\"abcd1234\\",\\"package_var_secret\\":\\"\${SECRET_0}\\",\\"input_var_secret\\":\\"\${SECRET_1}\\",\\"streams\\":[{\\"id\\":\\"test_input-secrets.log-abcd1234\\",\\"data_stream\\":{\\"type\\":\\"logs\\",\\"dataset\\":\\"secrets.log\\"},\\"package_var_secret\\":\\"\${SECRET_0}\\",\\"input_var_secret\\":\\"\${SECRET_1}\\",\\"stream_var_secret\\":\\"\${SECRET_2}\\"}],\\"meta\\":{\\"package\\":{\\"name\\":\\"secrets\\",\\"version\\":\\"1.0.0\\"}}}],\\"secret_references\\":[{\\"id\\":\\"secret-id-1\\"},{\\"id\\":\\"secret-id-2\\"},{\\"id\\":\\"secret-id-3\\"}],\\"revision\\":2,\\"agent\\":{},\\"signed\\":{},\\"output_permissions\\":{},\\"fleet\\":{}}"`
    );
  });

  it('should quote date-only strings to prevent YAML 1.1 timestamp interpretation by the agent', () => {
    // Integrations like microsoft_defender_cloud use date-only API versions (e.g. 2021-06-01).
    // The Elastic Agent parses policy YAML with a YAML 1.1 parser, which treats unquoted
    // YYYY-MM-DD values as timestamps and converts them to RFC3339 (2021-06-01T00:00:00Z).
    // The yaml-1.1 schema in Document options forces these values to be quoted.
    const policy = {
      id: 'test-policy',
      outputs: {},
      inputs: [
        {
          id: 'test-input',
          type: 'cel',
          streams: [
            {
              id: 'test-stream',
              state: {
                assessment_api_version: '2021-06-01',
                sub_assessment_api_version: '2019-01-01-preview',
              },
            },
          ],
        },
      ],
      revision: 1,
      agent: {},
    } as unknown as FullAgentPolicy;

    const result = fullAgentPolicyToYaml(policy, yaml);

    expect(result).toContain('assessment_api_version: "2021-06-01"');
    expect(result).toContain('sub_assessment_api_version: 2019-01-01-preview');
  });
});

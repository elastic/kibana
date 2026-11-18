/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';

import type { AgentlessAgentPolicyConfig, GlobalDataTag } from '../../../common/types';
import { getSettings } from '../../services/form_settings';

import {
  AgentPolicyBaseSchema,
  AgentPolicyOverridesRequestSchema,
  AgentPolicyResponseSchema,
  AgentPolicySchemaV8,
  FullAgentPolicyResponseSchema,
  NewAgentPolicySchema,
} from './agent_policy';
import { PreconfiguredAgentPoliciesSchema } from './preconfiguration';

describe('AgentPolicyBaseSchema', () => {
  describe('global_data_tags validations', () => {
    it('should throw an error if provided with duplicate tag names', () => {
      const tags: GlobalDataTag[] = [
        {
          name: 'testName',
          value: 'testValue',
        },
        {
          name: 'testName',
          value: 'testValue2',
        },
        {
          name: 'anotherName',
          value: 'value',
        },
        {
          name: 'anotherName',
          value: 'value2',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).toThrow(
        `Found duplicate tag names: ['testName', 'anotherName'], duplicate tag names are not allowed.`
      );
    });

    it('should throw an error if provided with tag names with spaces in it', () => {
      const tags: GlobalDataTag[] = [
        {
          name: ' testName',
          value: 'testValue',
        },
        {
          name: 'test Name',
          value: 'testValue2',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).toThrow(
        `Found tag names with spaces: [' testName', 'test Name'], tag names with spaces are not allowed.`
      );
    });

    it('should throw an error showing all validation errors', () => {
      const tags: GlobalDataTag[] = [
        {
          name: ' testName',
          value: 'testValue',
        },
        {
          name: 'testName ',
          value: 'testValue2',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).toThrow(
        `Found duplicate tag names: ['testName'], duplicate tag names are not allowed. Found tag names with spaces: [' testName', 'testName '], tag names with spaces are not allowed.`
      );
    });

    it('should not throw an error if provided with valid global data tags', () => {
      const tags: GlobalDataTag[] = [
        {
          name: 'testName',
          value: 'testValue',
        },
        {
          name: 'anotherName',
          value: 'anotherValue',
        },
      ];

      expect(() => {
        AgentPolicyBaseSchema.global_data_tags.validate(tags);
      }).not.toThrow();
    });

    it('should not throw an error if provided with empty agentless resources', () => {
      const agentless: AgentlessAgentPolicyConfig = {};

      expect(() => {
        AgentPolicyBaseSchema.agentless.validate(agentless);
      }).not.toThrow();
    });

    it('should not throw an error if provided with valid agentless resources', () => {
      const agentless: AgentlessAgentPolicyConfig = {
        resources: {
          requests: {
            memory: '1Gi',
            cpu: '1',
          },
        },
      };

      expect(() => {
        AgentPolicyBaseSchema.agentless.validate(agentless);
      }).not.toThrow();
    });

    it('should throw an error if provided with invalid agentless memory', () => {
      const agentless: AgentlessAgentPolicyConfig = {
        resources: {
          requests: {
            memory: '1',
          },
        },
      };

      expect(() => {
        AgentPolicyBaseSchema.agentless.validate(agentless);
      }).toThrow();
    });

    it('should throw an error if provided with invalid agentless CPU', () => {
      const agentless: AgentlessAgentPolicyConfig = {
        resources: {
          requests: {
            cpu: '1CPU',
          },
        },
      };

      expect(() => {
        AgentPolicyBaseSchema.agentless.validate(agentless);
      }).toThrow();
    });
  });

  describe('overrides validations', () => {
    it('should throw an error if inputs key is provided', () => {
      expect(() => {
        AgentPolicyBaseSchema.overrides.validate({ 'inputs.foo': 'bar' });
      }).toThrow('inputs overrides is not allowed');
    });

    it('should throw an error if output_permissions key is provided', () => {
      expect(() => {
        AgentPolicyBaseSchema.overrides.validate({ output_permissions: { _fallback: {} } });
      }).toThrow('output_permissions overrides is not allowed');
    });

    it('should throw an error if nested output_permissions key is provided', () => {
      expect(() => {
        AgentPolicyBaseSchema.overrides.validate({ 'output_permissions.someOutput': {} });
      }).toThrow('output_permissions overrides is not allowed');
    });

    // The base schema feeds the persisted SO model-version schemas and the response schemas, which
    // must keep accepting overrides saved before the OpenTelemetry keys were denied.
    it('should keep accepting stored OpenTelemetry collector keys', () => {
      expect(() => {
        AgentPolicyBaseSchema.overrides.validate({
          receivers: { otlp: {} },
          'service.pipelines': {},
        });
      }).not.toThrow();
    });

    it('should not throw for valid overrides keys', () => {
      expect(() => {
        AgentPolicyBaseSchema.overrides.validate({ 'agent.monitoring.use_output': 'custom' });
      }).not.toThrow();
    });
  });
});

describe('AgentPolicyOverridesRequestSchema', () => {
  it.each(['receivers', 'exporters', 'processors', 'connectors', 'extensions', 'service'])(
    'should throw an error if the OTel key %s is provided',
    (key) => {
      expect(() => {
        AgentPolicyOverridesRequestSchema.validate({ [key]: { foo: {} } });
      }).toThrow(`${key} overrides is not allowed`);
    }
  );

  it('should throw an error if a dotted OTel key is provided', () => {
    expect(() => {
      AgentPolicyOverridesRequestSchema.validate({ 'extensions.pprof.save_to_file': '/tmp/x' });
    }).toThrow('extensions overrides is not allowed');
    expect(() => {
      AgentPolicyOverridesRequestSchema.validate({ 'service.pipelines': {} });
    }).toThrow('service overrides is not allowed');
  });

  it('should keep rejecting inputs and output_permissions', () => {
    expect(() => AgentPolicyOverridesRequestSchema.validate({ 'inputs.foo': 'bar' })).toThrow(
      'inputs overrides is not allowed'
    );
    expect(() =>
      AgentPolicyOverridesRequestSchema.validate({ 'output_permissions.someOutput': {} })
    ).toThrow('output_permissions overrides is not allowed');
  });

  it('should not throw for keys that only share a prefix with denied keys', () => {
    expect(() => {
      AgentPolicyOverridesRequestSchema.validate({ 'servicefoo.bar': 1, outputs: {} });
    }).not.toThrow();
  });

  it('should not throw for null or missing overrides', () => {
    expect(() => AgentPolicyOverridesRequestSchema.validate(null)).not.toThrow();
    expect(() => AgentPolicyOverridesRequestSchema.validate(undefined)).not.toThrow();
  });

  // Keys are bounded in reporting mode only: an overlong key is recorded, not rejected.
  it('should not reject a key longer than the reporting bound', () => {
    expect(() =>
      AgentPolicyOverridesRequestSchema.validate({ [`agent.${'a'.repeat(300)}`]: 'x' })
    ).not.toThrow();
  });
});

describe('agent policy overrides with OpenTelemetry collector keys', () => {
  const storedOverrides = { receivers: { otlp: {} } };
  const basePolicy = { name: 'policy', namespace: 'default' };

  it('are rejected in create and update requests', () => {
    expect(() =>
      NewAgentPolicySchema.validate({ ...basePolicy, overrides: storedOverrides })
    ).toThrow('receivers overrides is not allowed');
  });

  // kibana.yml is validated at startup: rejecting them would stop Kibana from starting after an
  // upgrade. They are stripped when the full agent policy is built instead.
  it('are accepted in kibana.yml preconfigured policies', () => {
    expect(() =>
      PreconfiguredAgentPoliciesSchema.validate([
        { ...basePolicy, id: 'preconfigured', overrides: storedOverrides },
      ])
    ).not.toThrow();
  });

  // Policies saved before these keys were denied are still created again by internal paths, such as
  // the space awareness migration and copying a policy, which validate the SO `create` schema.
  it('are accepted by the persisted SO create schema', () => {
    const soCreateSchema = AgentPolicySchemaV8.extends({}, { unknowns: 'ignore' });
    expect(() =>
      soCreateSchema.validate({ ...basePolicy, overrides: storedOverrides })
    ).not.toThrow();
  });

  // Responses are validated in dev mode: reading such a policy must not fail.
  it('are accepted by the response schema', () => {
    expect(() =>
      AgentPolicyResponseSchema.validate({
        ...basePolicy,
        id: 'policy-id',
        status: 'active',
        revision: 1,
        updated_at: '2026-01-01T00:00:00.000Z',
        updated_by: 'elastic',
        is_managed: false,
        is_protected: false,
        overrides: storedOverrides,
      })
    ).not.toThrow();
  });
});

describe('FullAgentPolicySchema', () => {
  it('support all advanced settings', () => {
    expect(() => {
      const advancedPolicySettings = getSettings('AGENT_POLICY_ADVANCED_SETTINGS');

      const policyData = {
        id: 'test-id',
        outputs: {},
        inputs: [],
        agent: {
          monitoring: {
            enabled: true,
            metrics: true,
            logs: true,
            traces: true,
          },
          download: { sourceURI: 'http://test' },
          features: {},
        },
      };

      for (const settings of advancedPolicySettings) {
        if (settings.example_value) {
          set(policyData, settings.name, settings.example_value);
        } else {
          throw new Error(`No example value provided for ${settings.name}`);
        }
      }

      FullAgentPolicyResponseSchema.validate(policyData);
    }).not.toThrow();
  });
});

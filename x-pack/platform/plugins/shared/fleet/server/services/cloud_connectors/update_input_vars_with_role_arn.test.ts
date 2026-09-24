/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '../../../common/types';

import { policyHoldsRoleArn, rewritePolicyRoleArn } from './update_input_vars_with_role_arn';

const OLD_ARN = 'arn:aws:iam::123456789012:role/OldRole';
const NEW_ARN = 'arn:aws:iam::123456789012:role/NewRole';

const wrapInputs = (inputs: NewPackagePolicyInput[]) => ({ inputs });

describe('rewritePolicyRoleArn', () => {
  describe('input-level vars', () => {
    it('rewrites role_arn on an input', () => {
      const policy = wrapInputs([
        {
          type: 'cloudbeat/cis_aws',
          enabled: true,
          vars: { role_arn: { type: 'text', value: OLD_ARN } },
          streams: [],
        } as unknown as NewPackagePolicyInput,
      ]);
      const { inputs, changed } = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(changed).toBe(true);
      expect(inputs[0].vars!.role_arn.value).toBe(NEW_ARN);
    });

    it('rewrites aws.role_arn on an input', () => {
      const policy = wrapInputs([
        {
          type: 'cloudbeat/asset_inventory_aws',
          enabled: true,
          vars: { 'aws.role_arn': { type: 'text', value: OLD_ARN } },
          streams: [],
        } as unknown as NewPackagePolicyInput,
      ]);
      const { inputs, changed } = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(changed).toBe(true);
      expect(inputs[0].vars!['aws.role_arn'].value).toBe(NEW_ARN);
    });
  });

  describe('stream-level vars', () => {
    it('rewrites role_arn on a stream', () => {
      const policy = wrapInputs([
        {
          type: 'aws/metrics',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'aws.ec2', type: 'metrics' },
              vars: { role_arn: { type: 'text', value: OLD_ARN } },
            },
          ],
        } as unknown as NewPackagePolicyInput,
      ]);
      const { inputs, changed } = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(changed).toBe(true);
      expect(inputs[0].streams![0].vars!.role_arn.value).toBe(NEW_ARN);
    });
  });

  describe('package-policy-level vars (top-level)', () => {
    it('rewrites role_arn at packagePolicy.vars when no input carries one', () => {
      // Mirrors the AWS package shape: `role_arn` lives on the package policy's top-level
      // `vars`, and every input/stream references it via handlebars in the compile step.
      const policy = {
        vars: {
          role_arn: { type: 'text', value: OLD_ARN },
          default_region: { type: 'text', value: 'us-east-2' },
        },
        inputs: [
          {
            type: 'aws/metrics',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'aws.ec2', type: 'metrics' },
                vars: { period: { type: 'text', value: '5m' } },
              },
            ],
          } as unknown as NewPackagePolicyInput,
        ],
      };
      const { vars, inputs, changed } = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(changed).toBe(true);
      expect(vars!.role_arn.value).toBe(NEW_ARN);
      // Unrelated vars preserved.
      expect(vars!.default_region.value).toBe('us-east-2');
      // Inputs untouched, same reference.
      expect(inputs).toBe(policy.inputs);
    });

    it('rewrites both packagePolicy.vars and input/stream vars in the same policy', () => {
      const policy = {
        vars: { role_arn: { type: 'text', value: OLD_ARN } },
        inputs: [
          {
            type: 'aws/metrics',
            enabled: true,
            vars: { 'aws.role_arn': { type: 'text', value: OLD_ARN } },
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'x', type: 'metrics' },
                vars: { role_arn: { type: 'text', value: OLD_ARN } },
              },
            ],
          } as unknown as NewPackagePolicyInput,
        ],
      };
      const { vars, inputs, changed } = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(changed).toBe(true);
      expect(vars!.role_arn.value).toBe(NEW_ARN);
      expect(inputs[0].vars!['aws.role_arn'].value).toBe(NEW_ARN);
      expect(inputs[0].streams![0].vars!.role_arn.value).toBe(NEW_ARN);
    });

    it('leaves packagePolicy.vars untouched when it has no role_arn key', () => {
      const policy = {
        vars: { default_region: { type: 'text', value: 'us-east-2' } },
        inputs: [
          {
            type: 'aws/metrics',
            enabled: true,
            vars: { role_arn: { type: 'text', value: OLD_ARN } },
            streams: [],
          } as unknown as NewPackagePolicyInput,
        ],
      };
      const { vars, inputs, changed } = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(changed).toBe(true);
      expect(vars).toBe(policy.vars);
      expect(inputs[0].vars!.role_arn.value).toBe(NEW_ARN);
    });

    it('accepts a policy without top-level vars (undefined)', () => {
      const policy = wrapInputs([
        {
          type: 'cloudbeat/cis_aws',
          enabled: true,
          vars: { role_arn: { type: 'text', value: OLD_ARN } },
          streams: [],
        } as unknown as NewPackagePolicyInput,
      ]);
      const { vars, inputs, changed } = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(changed).toBe(true);
      expect(vars).toBeUndefined();
      expect(inputs[0].vars!.role_arn.value).toBe(NEW_ARN);
    });
  });

  describe('no-op semantics', () => {
    it('reports changed=false when neither top-level vars nor inputs carry a role_arn', () => {
      const policy = {
        vars: { default_region: { type: 'text', value: 'us-east-2' } },
        inputs: [
          {
            type: 'x',
            enabled: true,
            vars: { other: { type: 'text', value: 'v' } },
            streams: [],
          } as unknown as NewPackagePolicyInput,
        ],
      };
      const result = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(result.changed).toBe(false);
      expect(result.vars).toBe(policy.vars);
      expect(result.inputs).toBe(policy.inputs);
    });

    it('reports changed=false when every existing occurrence already equals the new value', () => {
      const policy = {
        vars: { role_arn: { type: 'text', value: NEW_ARN } },
        inputs: [
          {
            type: 'cloudbeat/cis_aws',
            enabled: true,
            vars: { role_arn: { type: 'text', value: NEW_ARN } },
            streams: [
              {
                enabled: true,
                data_stream: { dataset: 'x', type: 'metrics' },
                vars: { role_arn: { type: 'text', value: NEW_ARN } },
              },
            ],
          } as unknown as NewPackagePolicyInput,
        ],
      };
      const result = rewritePolicyRoleArn(policy, NEW_ARN);
      expect(result.changed).toBe(false);
      expect(result.vars).toBe(policy.vars);
      expect(result.inputs).toBe(policy.inputs);
    });

    it('does not mutate the input policy object', () => {
      const policy = {
        vars: { role_arn: { type: 'text', value: OLD_ARN } },
        inputs: [
          {
            type: 'cloudbeat/cis_aws',
            enabled: true,
            vars: { role_arn: { type: 'text', value: OLD_ARN } },
            streams: [],
          } as unknown as NewPackagePolicyInput,
        ],
      };
      const before = JSON.parse(JSON.stringify(policy));
      rewritePolicyRoleArn(policy, NEW_ARN);
      expect(policy).toEqual(before);
    });
  });

  describe('policyHoldsRoleArn', () => {
    it('is true when every role_arn field equals the value', () => {
      expect(
        policyHoldsRoleArn(
          {
            vars: { role_arn: { type: 'text', value: NEW_ARN } },
            inputs: [],
          },
          NEW_ARN
        )
      ).toBe(true);
    });

    it('is false when the policy has no role_arn fields (even though rewrite would be a no-op)', () => {
      expect(policyHoldsRoleArn({ vars: {}, inputs: [] }, NEW_ARN)).toBe(false);
      expect(
        policyHoldsRoleArn(
          {
            inputs: [
              {
                type: 'x',
                enabled: true,
                vars: {},
                streams: [],
              } as unknown as NewPackagePolicyInput,
            ],
          },
          NEW_ARN
        )
      ).toBe(false);
    });

    it('is false when any role_arn field still holds a different value', () => {
      expect(
        policyHoldsRoleArn(
          {
            vars: { role_arn: { type: 'text', value: OLD_ARN } },
            inputs: [],
          },
          NEW_ARN
        )
      ).toBe(false);
    });
  });
});

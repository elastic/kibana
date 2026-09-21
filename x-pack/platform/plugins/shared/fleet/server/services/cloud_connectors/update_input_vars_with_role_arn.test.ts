/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicyInput } from '../../../common/types';

import { updateInputsWithRoleArn } from './update_input_vars_with_role_arn';

const NEW_ARN = 'arn:aws:iam::123456789012:role/NewRole';

describe('updateInputsWithRoleArn', () => {
  it('rewrites role_arn at input level', () => {
    const inputs = [
      {
        type: 'cloudbeat/cis_aws',
        enabled: true,
        vars: {
          role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/OldRole' },
        },
        streams: [],
      },
    ];
    const { updated, changed } = updateInputsWithRoleArn(inputs, NEW_ARN);
    expect(changed).toBe(true);
    expect(updated[0].vars!.role_arn.value).toBe(NEW_ARN);
  });

  it('rewrites aws.role_arn at input level', () => {
    const inputs = [
      {
        type: 'cloudbeat/asset_inventory_aws',
        enabled: true,
        vars: {
          'aws.role_arn': { type: 'text', value: 'arn:aws:iam::123456789012:role/OldRole' },
        },
        streams: [],
      },
    ];
    const { updated, changed } = updateInputsWithRoleArn(inputs, NEW_ARN);
    expect(changed).toBe(true);
    expect(updated[0].vars!['aws.role_arn'].value).toBe(NEW_ARN);
  });

  it('rewrites role_arn at stream level', () => {
    const inputs = [
      {
        type: 'aws/metrics',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { dataset: 'aws.ec2', type: 'metrics' },
            vars: {
              role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/OldRole' },
            },
          },
        ],
      },
    ];
    const { updated, changed } = updateInputsWithRoleArn(inputs, NEW_ARN);
    expect(changed).toBe(true);
    expect(updated[0].streams[0].vars!.role_arn.value).toBe(NEW_ARN);
  });

  it('rewrites both variants across mixed inputs and streams', () => {
    const inputs = [
      {
        type: 'cloudbeat/cis_aws',
        enabled: true,
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/OldA' } },
        streams: [
          {
            enabled: true,
            data_stream: { dataset: 'x', type: 'logs' },
            vars: {
              'aws.role_arn': { type: 'text', value: 'arn:aws:iam::123456789012:role/OldA' },
            },
          },
        ],
      },
      {
        type: 'aws/metrics',
        enabled: true,
        vars: { 'aws.role_arn': { type: 'text', value: 'arn:aws:iam::123456789012:role/OldA' } },
        streams: [
          {
            enabled: true,
            data_stream: { dataset: 'y', type: 'metrics' },
            vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/OldA' } },
          },
        ],
      },
    ];
    const { updated, changed } = updateInputsWithRoleArn(
      inputs as unknown as NewPackagePolicyInput[],
      NEW_ARN
    );
    expect(changed).toBe(true);
    expect(updated[0].vars!.role_arn.value).toBe(NEW_ARN);
    expect(updated[0].streams[0].vars!['aws.role_arn'].value).toBe(NEW_ARN);
    expect(updated[1].vars!['aws.role_arn'].value).toBe(NEW_ARN);
    expect(updated[1].streams[0].vars!.role_arn.value).toBe(NEW_ARN);
  });

  it('is a no-op when no role_arn key exists', () => {
    const inputs = [{ type: 'x', enabled: true, vars: { other: { value: 'v' } }, streams: [] }];
    const { updated, changed } = updateInputsWithRoleArn(inputs, NEW_ARN);
    expect(changed).toBe(false);
    expect(updated).toBe(inputs);
  });

  it('reports changed=false when every occurrence already equals the new value', () => {
    const inputs = [
      {
        type: 'cloudbeat/cis_aws',
        enabled: true,
        vars: { role_arn: { type: 'text', value: NEW_ARN } },
        streams: [],
      },
    ];
    const { updated, changed } = updateInputsWithRoleArn(inputs, NEW_ARN);
    expect(changed).toBe(false);
    expect(updated).toBe(inputs);
  });

  it('does not mutate the input object', () => {
    const inputs = [
      {
        type: 'cloudbeat/cis_aws',
        enabled: true,
        vars: { role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/OldRole' } },
        streams: [],
      },
    ];
    const before = JSON.parse(JSON.stringify(inputs));
    updateInputsWithRoleArn(inputs, NEW_ARN);
    expect(inputs).toEqual(before);
  });
});

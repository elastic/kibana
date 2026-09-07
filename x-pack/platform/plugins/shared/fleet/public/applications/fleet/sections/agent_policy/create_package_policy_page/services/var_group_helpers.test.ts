/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, RegistryVarGroup } from '../../../../types';

import {
  getHiddenVarGroupOptionsForDisabledProviders,
  getHiddenVarGroupOptionsForPolicyTemplate,
  mergeHiddenVarGroupOptions,
} from './var_group_helpers';

describe('getHiddenVarGroupOptionsForDisabledProviders', () => {
  const varGroups: RegistryVarGroup[] = [
    {
      name: 'credential_type',
      title: 'Setup Access',
      selector_title: 'Preferred method',
      options: [
        { name: 'identity_federation', title: 'Identity Federation', vars: [], provider: 'aws' },
        { name: 'direct_access_key', title: 'Direct Access Keys', vars: [] },
      ],
    },
    {
      name: 'other_group',
      title: 'Other',
      selector_title: 'Other',
      options: [
        { name: 'azure_if', title: 'Azure IF', vars: [], provider: 'azure' },
        { name: 'plain', title: 'Plain', vars: [] },
      ],
    },
  ];

  it('hides options whose provider is disabled, across var_groups', () => {
    expect(getHiddenVarGroupOptionsForDisabledProviders(varGroups, ['aws', 'azure'])).toEqual({
      credential_type: ['identity_federation'],
      other_group: ['azure_if'],
    });
  });

  it('only hides options for the disabled providers', () => {
    expect(getHiddenVarGroupOptionsForDisabledProviders(varGroups, ['aws'])).toEqual({
      credential_type: ['identity_federation'],
    });
  });

  it('keeps a disabled option visible when it is the saved selection for its var_group', () => {
    expect(
      getHiddenVarGroupOptionsForDisabledProviders(varGroups, ['aws'], {
        credential_type: 'identity_federation',
      })
    ).toBeUndefined();
  });

  it('returns undefined when no providers are disabled or there are no var_groups', () => {
    expect(getHiddenVarGroupOptionsForDisabledProviders(varGroups, [])).toBeUndefined();
    expect(getHiddenVarGroupOptionsForDisabledProviders(undefined, ['aws'])).toBeUndefined();
    expect(getHiddenVarGroupOptionsForDisabledProviders([], ['aws'])).toBeUndefined();
  });
});

describe('mergeHiddenVarGroupOptions', () => {
  it('unions option names per var_group and dedupes', () => {
    expect(
      mergeHiddenVarGroupOptions({ credential_type: ['identity_federation'] }, undefined, {
        credential_type: ['identity_federation', 'assume_role'],
        other: ['x'],
      })
    ).toEqual({ credential_type: ['identity_federation', 'assume_role'], other: ['x'] });
  });

  it('returns undefined when every input is empty or undefined', () => {
    expect(mergeHiddenVarGroupOptions(undefined, undefined)).toBeUndefined();
    expect(mergeHiddenVarGroupOptions({}, undefined)).toBeUndefined();
  });
});

describe('getHiddenVarGroupOptionsForPolicyTemplate', () => {
  const agentlessDeploymentModes = {
    default: { enabled: true },
    agentless: { enabled: true },
  };

  const buildPackageInfo = (policyTemplates: unknown[]): PackageInfo =>
    ({
      name: 'aws',
      version: '7.0.0',
      var_groups: [
        {
          name: 'credential_type',
          title: 'Setup Access',
          options: [
            { name: 'identity_federation', title: 'Identity Federation', vars: [] },
            { name: 'direct_access_key', title: 'Direct Access Keys', vars: [] },
          ],
        },
      ],
      policy_templates: policyTemplates,
    } as unknown as PackageInfo);

  it('hides an option when every input of the policy template hides it', () => {
    const packageInfo = buildPackageInfo([
      {
        name: 'rds',
        deployment_modes: agentlessDeploymentModes,
        inputs: [
          {
            type: 'aws/metrics',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
      },
    ]);

    expect(getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 'rds', true)).toEqual({
      credential_type: ['identity_federation'],
    });
  });

  it('does not hide an option when at least one available input supports it', () => {
    const packageInfo = buildPackageInfo([
      {
        name: 'guardduty',
        deployment_modes: agentlessDeploymentModes,
        inputs: [
          { type: 'httpjson' },
          {
            type: 'aws/metrics',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
      },
    ]);

    expect(
      getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 'guardduty', true)
    ).toBeUndefined();
  });

  it('returns undefined when no input of the policy template hides any option', () => {
    const packageInfo = buildPackageInfo([
      {
        name: 'cloudtrail',
        inputs: [{ type: 'httpjson' }, { type: 'aws-cloudwatch' }],
      },
    ]);

    expect(
      getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 'cloudtrail', false)
    ).toBeUndefined();
  });

  it('ignores inputs that are not available in agentless mode (blocklisted input types)', () => {
    // Mirrors the AWS `s3` template: the aws-s3 logs input supports identity federation
    // but cannot run agentless (AGENTLESS_DISABLED_INPUTS), so only metrics remains and
    // identity_federation must be hidden.
    const packageInfo = buildPackageInfo([
      {
        name: 's3',
        deployment_modes: agentlessDeploymentModes,
        inputs: [
          { type: 'aws-s3' },
          {
            type: 'aws/metrics',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
      },
    ]);

    expect(getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 's3', true)).toEqual({
      credential_type: ['identity_federation'],
    });
  });

  it('does not hide an option in default mode when a blocklisted-for-agentless input supports it', () => {
    const packageInfo = buildPackageInfo([
      {
        name: 's3',
        deployment_modes: agentlessDeploymentModes,
        inputs: [
          { type: 'aws-s3' },
          {
            type: 'aws/metrics',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
      },
    ]);

    expect(getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 's3', false)).toBeUndefined();
  });

  it('honors input-level deployment_modes overriding the agentless blocklist', () => {
    const packageInfo = buildPackageInfo([
      {
        name: 's3',
        deployment_modes: agentlessDeploymentModes,
        inputs: [
          { type: 'aws-s3', deployment_modes: ['default', 'agentless'] },
          {
            type: 'aws/metrics',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
      },
    ]);

    expect(getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 's3', true)).toBeUndefined();
  });

  it('handles multiple var groups and multiple hidden options', () => {
    const packageInfo = {
      name: 'test',
      version: '1.0.0',
      var_groups: [
        {
          name: 'credential_type',
          title: 'Setup Access',
          options: [
            { name: 'identity_federation', title: 'Identity Federation', vars: [] },
            { name: 'direct_access_key', title: 'Direct Access Keys', vars: [] },
          ],
        },
        {
          name: 'collection_mode',
          title: 'Collection Mode',
          options: [
            { name: 'push', title: 'Push', vars: [] },
            { name: 'pull', title: 'Pull', vars: [] },
          ],
        },
      ],
      policy_templates: [
        {
          name: 'template_a',
          inputs: [
            {
              type: 'logs',
              hide_in_var_group_options: {
                credential_type: ['identity_federation', 'direct_access_key'],
                collection_mode: ['push'],
              },
            },
            {
              type: 'metrics',
              hide_in_var_group_options: {
                credential_type: ['identity_federation', 'direct_access_key'],
              },
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    expect(getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 'template_a', false)).toEqual({
      credential_type: ['identity_federation', 'direct_access_key'],
    });
  });

  it('returns undefined when the package has no var_groups', () => {
    const packageInfo = {
      name: 'test',
      version: '1.0.0',
      policy_templates: [{ name: 'rds', inputs: [{ type: 'aws/metrics' }] }],
    } as unknown as PackageInfo;

    expect(getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 'rds', false)).toBeUndefined();
  });

  it('returns undefined when no policy template name is provided', () => {
    const packageInfo = buildPackageInfo([
      {
        name: 'rds',
        inputs: [
          {
            type: 'aws/metrics',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
      },
    ]);

    expect(
      getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, undefined, false)
    ).toBeUndefined();
  });

  it('returns undefined when the policy template is not found', () => {
    const packageInfo = buildPackageInfo([
      {
        name: 'rds',
        inputs: [
          {
            type: 'aws/metrics',
            hide_in_var_group_options: { credential_type: ['identity_federation'] },
          },
        ],
      },
    ]);

    expect(
      getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 'unknown', false)
    ).toBeUndefined();
  });

  it('returns undefined when packageInfo is undefined', () => {
    expect(getHiddenVarGroupOptionsForPolicyTemplate(undefined, 'rds', false)).toBeUndefined();
  });

  it('returns undefined when the policy template has no inputs', () => {
    const packageInfo = buildPackageInfo([{ name: 'empty_template', inputs: [] }]);

    expect(
      getHiddenVarGroupOptionsForPolicyTemplate(packageInfo, 'empty_template', false)
    ).toBeUndefined();
  });
});

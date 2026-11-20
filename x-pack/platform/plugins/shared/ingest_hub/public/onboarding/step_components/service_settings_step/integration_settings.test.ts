/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import {
  MAX_CONDITION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_INTEGRATION_NAME_LENGTH,
  getConditionErrors,
  getCustomFieldsErrors,
  getDescriptionError,
  getIntegrationNameError,
  getProxyUrlError,
  getReroutePermissionsError,
  MAX_CUSTOM_FIELD_LENGTH,
  MAX_CUSTOM_FIELDS,
  MAX_REROUTE_PERMISSIONS,
  MAX_PROXY_URL_LENGTH,
  supportsIntegrationSettings,
} from './integration_settings';

describe('getIntegrationNameError', () => {
  it('requires a name', () => {
    expect(getIntegrationNameError('')).toBeDefined();
    expect(getIntegrationNameError('   ')).toBeDefined();
  });

  it('accepts a name up to the limit', () => {
    expect(getIntegrationNameError('a'.repeat(MAX_INTEGRATION_NAME_LENGTH))).toBeUndefined();
  });

  it('rejects a longer name, which would not fit Fleet once suffixed', () => {
    expect(getIntegrationNameError('a'.repeat(MAX_INTEGRATION_NAME_LENGTH + 1))).toBeDefined();
  });
});

describe('getConditionErrors', () => {
  it('allows no condition', () => {
    expect(getConditionErrors('')).toBeUndefined();
    expect(getConditionErrors('   ')).toBeUndefined();
  });

  it('accepts a valid condition', () => {
    expect(getConditionErrors('${host.platform} == "linux"')).toBeUndefined();
  });

  it('reports where the syntax is wrong', () => {
    expect(getConditionErrors('${host.platform} ==')).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Line 1, column \d+: /)])
    );
  });

  it('rejects a condition over the Fleet limit', () => {
    const tooLong = `"${'a'.repeat(MAX_CONDITION_LENGTH)}"`;
    expect(getConditionErrors(tooLong)).toEqual([
      'The condition must be 10000 characters or less.',
    ]);
  });
});

describe('getDescriptionError', () => {
  it('allows an empty description', () => {
    expect(getDescriptionError('')).toBeUndefined();
  });

  it('rejects a description over the Fleet limit', () => {
    expect(getDescriptionError('a'.repeat(MAX_DESCRIPTION_LENGTH))).toBeUndefined();
    expect(getDescriptionError('a'.repeat(MAX_DESCRIPTION_LENGTH + 1))).toBeDefined();
  });
});

describe('supportsIntegrationSettings', () => {
  const service = (methods: string[]) =>
    ({
      deploymentMethods: methods.map((method) => ({ method })),
    } as unknown as AwsServiceMatrixEntry);

  it('is false for ECF-only services, which create no package policy', () => {
    expect(supportsIntegrationSettings(service(['ecf']))).toBe(false);
  });

  it('is true for ECF-only services in agent-based mode, which deploys them as policies', () => {
    expect(supportsIntegrationSettings(service(['ecf']), 'agent_based')).toBe(true);
    expect(supportsIntegrationSettings(service(['ecf']), 'managed_integration')).toBe(false);
  });

  it('is true when a service can be deployed as a policy', () => {
    expect(supportsIntegrationSettings(service(['ecf', 'managed_integration']))).toBe(true);
    expect(supportsIntegrationSettings(service(['agent_based']))).toBe(true);
  });
});

describe('getProxyUrlError', () => {
  it('accepts an empty value and http(s) URLs', () => {
    expect(getProxyUrlError('')).toBeUndefined();
    expect(getProxyUrlError('  ')).toBeUndefined();
    expect(getProxyUrlError('http://proxy.local:3128')).toBeUndefined();
    expect(getProxyUrlError('https://user:pass@proxy.local:8080')).toBeUndefined();
    expect(getProxyUrlError('HTTP://proxy.local:3128')).toBeUndefined();
    expect(getProxyUrlError('http://192.168.1.10:3128')).toBeUndefined();
    expect(getProxyUrlError('  http://proxy.local:3128  ')).toBeUndefined();
  });

  it('rejects forms that new URL() repairs but the agent would receive unchanged', () => {
    expect(getProxyUrlError('http:proxy.local:3128')).toBeDefined();
    expect(getProxyUrlError('http:/proxy.local:3128')).toBeDefined();
    expect(getProxyUrlError('http:///proxy.local:3128')).toBeDefined();
    expect(getProxyUrlError('http:\\\\proxy.local:3128')).toBeDefined();
    expect(getProxyUrlError('https:proxy.local')).toBeDefined();
  });

  it('rejects a URL without a host', () => {
    expect(getProxyUrlError('http://')).toBeDefined();
    expect(getProxyUrlError('https://:3128')).toBeDefined();
    expect(getProxyUrlError('http://user@')).toBeDefined();
    expect(getProxyUrlError('http:// proxy.local')).toBeDefined();
  });

  it('rejects other schemes and text that is not a URL', () => {
    expect(getProxyUrlError('ftp://proxy.local')).toBeDefined();
    expect(getProxyUrlError('not a url')).toBeDefined();
    expect(getProxyUrlError('proxy.local:3128')).toBeDefined();
  });

  it('rejects a value longer than Fleet stores', () => {
    const long = `http://${'a'.repeat(MAX_PROXY_URL_LENGTH)}`;
    expect(getProxyUrlError(long)).toBeDefined();
  });
});

describe('getReroutePermissionsError', () => {
  it('accepts none, or names that start with a data stream type', () => {
    expect(getReroutePermissionsError([])).toBeUndefined();
    expect(
      getReroutePermissionsError([
        'logs-a-default',
        'metrics-a-default',
        'traces-a-default',
        'synthetics-a-default',
        'profiles-a-default',
      ])
    ).toBeUndefined();
  });

  it('ignores blank entries', () => {
    expect(getReroutePermissionsError(['', '  '])).toBeUndefined();
  });

  it('rejects a name Fleet would reject, and names it', () => {
    expect(getReroutePermissionsError(['logs-ok', 'foo-bar'])).toContain('foo-bar');
    expect(getReroutePermissionsError(['logs-'])).toBeDefined();
  });

  it('rejects an entry or a list longer than Fleet accepts', () => {
    expect(getReroutePermissionsError([`logs-${'a'.repeat(256)}`])).toBeDefined();
    const many = Array.from({ length: MAX_REROUTE_PERMISSIONS + 1 }, (_, i) => `logs-a-${i}`);
    expect(getReroutePermissionsError(many)).toBeDefined();
  });
});

describe('getCustomFieldsErrors', () => {
  it('accepts no fields, valid fields, and rows left blank', () => {
    expect(getCustomFieldsErrors([])).toBeUndefined();
    expect(getCustomFieldsErrors([{ name: 'team', value: 'platform' }])).toBeUndefined();
    expect(
      getCustomFieldsErrors([
        { name: '', value: '' },
        { name: ' ', value: ' ' },
      ])
    ).toBeUndefined();
  });

  it('requires a name and a value for a started row', () => {
    const errors = getCustomFieldsErrors([
      { name: '', value: 'platform' },
      { name: 'team', value: '' },
    ]);
    expect(errors?.rows[0].name).toBeDefined();
    expect(errors?.rows[0].value).toBeUndefined();
    expect(errors?.rows[1].name).toBeUndefined();
    expect(errors?.rows[1].value).toBeDefined();
  });

  it('rejects a name with spaces', () => {
    expect(getCustomFieldsErrors([{ name: 'my team', value: 'a' }])?.rows[0].name).toBeDefined();
    expect(getCustomFieldsErrors([{ name: 'my\tteam', value: 'a' }])?.rows[0].name).toBeDefined();
  });

  it('rejects a repeated name on every row that has it', () => {
    const errors = getCustomFieldsErrors([
      { name: 'team', value: 'a' },
      { name: 'env', value: 'b' },
      { name: ' team ', value: 'c' },
    ]);
    expect(errors?.rows[0].name).toBeDefined();
    expect(errors?.rows[1].name).toBeUndefined();
    expect(errors?.rows[2].name).toBeDefined();
  });

  it('rejects a name or value longer than the agentless API accepts', () => {
    const long = 'a'.repeat(MAX_CUSTOM_FIELD_LENGTH + 1);
    expect(getCustomFieldsErrors([{ name: long, value: 'a' }])?.rows[0].name).toBeDefined();
    expect(getCustomFieldsErrors([{ name: 'a', value: long }])?.rows[0].value).toBeDefined();
  });

  it('rejects more fields than Fleet accepts', () => {
    const many = Array.from({ length: MAX_CUSTOM_FIELDS + 1 }, (_, i) => ({
      name: `n${i}`,
      value: 'v',
    }));
    expect(getCustomFieldsErrors(many)?.list).toBeDefined();
    expect(getCustomFieldsErrors(many.slice(1))).toBeUndefined();
  });

  it('rejects fields that do not fit the onboarding record in total', () => {
    const wide = Array.from({ length: 20 }, (_, i) => ({
      name: `n${i}`,
      value: 'v'.repeat(MAX_CUSTOM_FIELD_LENGTH),
    }));
    expect(getCustomFieldsErrors(wide)?.list).toBeDefined();
  });
});

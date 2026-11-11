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
  getDescriptionError,
  getIntegrationNameError,
  getProxyUrlError,
  getReroutePermissionsError,
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

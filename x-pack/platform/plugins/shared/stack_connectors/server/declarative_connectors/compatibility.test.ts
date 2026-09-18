/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkAdditiveCompatibility } from './compatibility';
import { parseDeclarativeConnectorSpec } from './parse_spec';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  LIVE_ABUSEIPDB_1_0_0_YAML,
  LIVE_ABUSEIPDB_1_1_0_YAML,
} from './test_fixtures';

const base = parseDeclarativeConnectorSpec(ABUSE_IPDB_SPEC_FIXTURE);

const withConfig = (config: Record<string, unknown>) => ({ ...base, config });

describe('checkAdditiveCompatibility', () => {
  it('accepts the live 1.0.0 to 1.1.0 AbuseIPDB change', () => {
    const result = checkAdditiveCompatibility(
      parseDeclarativeConnectorSpec(LIVE_ABUSEIPDB_1_0_0_YAML),
      parseDeclarativeConnectorSpec(LIVE_ABUSEIPDB_1_1_0_YAML)
    );
    expect(result).toEqual({ compatible: true, reasons: [] });
  });

  it('accepts a new optional property and a new required property with a default', () => {
    const next = withConfig({
      type: 'object',
      required: ['baseUrl', 'region'],
      properties: {
        baseUrl: { type: 'string', format: 'uri' },
        region: { type: 'string', default: 'us' },
        timeoutMs: { type: 'number' },
      },
    });
    expect(checkAdditiveCompatibility(base, next).compatible).toBe(true);
  });

  it('rejects a removed property', () => {
    const next = withConfig({ type: 'object', properties: {} });
    expect(checkAdditiveCompatibility(base, next)).toEqual({
      compatible: false,
      reasons: ['config.baseUrl was removed'],
    });
  });

  it('rejects a changed property type', () => {
    const next = withConfig({
      type: 'object',
      required: ['baseUrl'],
      properties: { baseUrl: { type: 'number' } },
    });
    expect(checkAdditiveCompatibility(base, next).reasons).toEqual([
      'config.baseUrl changed type from string to number',
    ]);
  });

  it('rejects a new required property without a default', () => {
    const next = withConfig({
      type: 'object',
      required: ['baseUrl', 'region'],
      properties: { baseUrl: { type: 'string' }, region: { type: 'string' } },
    });
    expect(checkAdditiveCompatibility(base, next).reasons).toEqual([
      'config.region became required without a default',
    ]);
  });

  it('rejects removed auth types and removed actions', () => {
    const next = {
      ...base,
      auth: { types: ['basic'] },
      actions: { checkIp: base.actions.checkIp },
    };
    expect(checkAdditiveCompatibility(base, next).reasons).toEqual([
      'auth type api_key_header was removed',
      'action reportIp was removed',
    ]);
  });

  it('checks action input schemas with the same rule', () => {
    const next = {
      ...base,
      actions: {
        ...base.actions,
        checkIp: {
          ...base.actions.checkIp,
          input: {
            type: 'object',
            required: ['ipAddress'],
            properties: { ipAddress: { type: 'number' } },
          },
        },
      },
    };
    expect(checkAdditiveCompatibility(base, next).reasons).toEqual([
      'actions.checkIp.input.ipAddress changed type from string to number',
    ]);
  });
});

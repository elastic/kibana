/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveDeductiveConfig, shouldUseDeductive } from './config';

describe('resolveDeductiveConfig', () => {
  afterEach(() => {
    delete process.env.DEDUCTIVE_API_KEY;
    delete process.env.DEDUCTIVE_ENDPOINT;
    delete process.env.DEDUCTIVE_REFRESH_TOKEN;
    delete process.env.DEDUCTIVE_TEAM_ID;
  });

  it('env provides VALUES as a dev fallback but does not enable the path by itself', () => {
    process.env.DEDUCTIVE_API_KEY = 'dak_env';
    process.env.DEDUCTIVE_ENDPOINT = 'https://env.example';

    const cfg = resolveDeductiveConfig(undefined);
    expect(cfg.enabled).toBe(false); // enabled must come from the run context (flag)
    expect(cfg.token).toBe('dak_env');
    expect(cfg.endpoint).toBe('https://env.example');
  });

  it('Advanced Settings (context) take precedence over env', () => {
    process.env.DEDUCTIVE_API_KEY = 'dak_env';
    process.env.DEDUCTIVE_ENDPOINT = 'https://env.example';

    const cfg = resolveDeductiveConfig({
      enabled: true,
      endpoint: 'https://app.deductive.ai/',
      apiKey: 'dak_ui',
    });
    expect(cfg.token).toBe('dak_ui');
    expect(cfg.endpoint).toBe('https://app.deductive.ai'); // trailing slash stripped
  });

  it('does NOT leak env refreshToken/teamId when settings config is active (dak_ key needs none)', () => {
    process.env.DEDUCTIVE_REFRESH_TOKEN = 'env-refresh';
    process.env.DEDUCTIVE_TEAM_ID = 'env-team';
    process.env.DEDUCTIVE_API_KEY = 'dak_env';

    const cfg = resolveDeductiveConfig({
      enabled: true,
      endpoint: 'https://app.deductive.ai',
      apiKey: 'dak_ui',
    });
    expect(cfg.token).toBe('dak_ui');
    expect(cfg.refreshToken).toBeUndefined();
    expect(cfg.teamId).toBeUndefined();
  });

  it('disabled context keeps env-config out', () => {
    delete process.env.DEDUCTIVE_API_KEY;
    const cfg = resolveDeductiveConfig({ enabled: false, apiKey: 'dak_ui' });
    expect(cfg.enabled).toBe(false);
    expect(cfg.token).toBeUndefined(); // disabled context does not merge settings
  });
});

describe('shouldUseDeductive', () => {
  it('routes the built-in Deductive agent only', () => {
    expect(shouldUseDeductive('deductive.ai')).toBe(true);
    expect(shouldUseDeductive('other-agent')).toBe(false);
    expect(shouldUseDeductive(undefined)).toBe(false);
  });
});

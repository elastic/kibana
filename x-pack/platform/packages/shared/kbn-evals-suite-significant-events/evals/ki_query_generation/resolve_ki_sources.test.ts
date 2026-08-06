/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ENV_KEYS = [
  'KI_QUERY_GENERATION_KI_FEATURE_SOURCE',
  'SIGEVENTS_QUERYGEN_FEATURES_SOURCE',
] as const;

const loadSources = async (env: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}) => {
  jest.resetModules();
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, env);

  const { KI_FEATURE_SOURCES_TO_RUN } = await import('./resolve_ki_sources');
  return KI_FEATURE_SOURCES_TO_RUN;
};

describe('KI_FEATURE_SOURCES_TO_RUN', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('runs only the canonical variant by default', async () => {
    await expect(loadSources()).resolves.toEqual(['canonical']);
  });

  it('runs both variants when explicitly opted in', async () => {
    await expect(loadSources({ KI_QUERY_GENERATION_KI_FEATURE_SOURCE: 'both' })).resolves.toEqual([
      'canonical',
      'snapshot',
    ]);
  });

  it.each(['canonical', 'snapshot', 'auto'])('honours an explicit %s source', async (source) => {
    await expect(loadSources({ KI_QUERY_GENERATION_KI_FEATURE_SOURCE: source })).resolves.toEqual([
      source,
    ]);
  });

  it('supports the legacy env var', async () => {
    await expect(loadSources({ SIGEVENTS_QUERYGEN_FEATURES_SOURCE: 'snapshot' })).resolves.toEqual([
      'snapshot',
    ]);
  });

  it('falls back to auto for an unrecognized value', async () => {
    await expect(
      loadSources({ KI_QUERY_GENERATION_KI_FEATURE_SOURCE: 'nonsense' })
    ).resolves.toEqual(['auto']);
  });
});

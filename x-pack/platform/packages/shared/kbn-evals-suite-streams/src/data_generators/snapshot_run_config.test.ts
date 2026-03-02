/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GCS_BUCKET,
  OTEL_DEMO_GCS_BASE_PATH_PREFIX,
} from '../../scripts/significant_events_snapshots/lib/constants';

describe('snapshot_run_config', () => {
  const ORIGINAL = process.env.SIGEVENTS_SNAPSHOT_RUN;

  afterEach(() => {
    process.env.SIGEVENTS_SNAPSHOT_RUN = ORIGINAL;
    jest.resetModules();
  });

  it('defaults SIGEVENTS_SNAPSHOT_RUN to pinned date when env is unset', async () => {
    delete process.env.SIGEVENTS_SNAPSHOT_RUN;
    jest.resetModules();

    const mod = await import('./snapshot_run_config');
    expect(mod.SIGEVENTS_SNAPSHOT_RUN).toBe('2026-02-25');
  });

  it('uses SIGEVENTS_SNAPSHOT_RUN from env when set', async () => {
    process.env.SIGEVENTS_SNAPSHOT_RUN = '2026-02-26-test';
    jest.resetModules();

    const mod = await import('./snapshot_run_config');
    expect(mod.SIGEVENTS_SNAPSHOT_RUN).toBe('2026-02-26-test');
  });

  it('resolveBasePath appends run id to basePathPrefix when SIGEVENTS_SNAPSHOT_RUN is set', async () => {
    process.env.SIGEVENTS_SNAPSHOT_RUN = '2026-02-26-test';
    jest.resetModules();

    const { resolveBasePath } = await import('./snapshot_run_config');
    expect(
      resolveBasePath({ bucket: GCS_BUCKET, basePathPrefix: OTEL_DEMO_GCS_BASE_PATH_PREFIX })
    ).toBe('sigevents/otel-demo/2026-02-26-test');
  });
});

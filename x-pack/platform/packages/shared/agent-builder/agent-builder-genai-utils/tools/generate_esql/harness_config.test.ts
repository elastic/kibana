/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import {
  DEFAULT_ESQL_HARNESS_CONFIG,
  getEsqlHarnessConfig,
  renderFeedbackTemplate,
  truncateHarnessError,
} from './harness_config';

describe('harness config', () => {
  const originalEnv = process.env.ESQL_HARNESS_CONFIG;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ESQL_HARNESS_CONFIG;
    } else {
      process.env.ESQL_HARNESS_CONFIG = originalEnv;
    }
  });

  it('returns the defaults when no override file is configured', () => {
    delete process.env.ESQL_HARNESS_CONFIG;
    expect(getEsqlHarnessConfig()).toEqual(DEFAULT_ESQL_HARNESS_CONFIG);
  });

  it('deep-merges an override file over the defaults', () => {
    const path = Path.join(Os.tmpdir(), `harness-config-${Date.now()}.json`);
    Fs.writeFileSync(path, JSON.stringify({ exemplars: { selection: 'knn' } }));
    process.env.ESQL_HARNESS_CONFIG = path;

    const config = getEsqlHarnessConfig();
    expect(config.exemplars).toEqual({ selection: 'knn', k: DEFAULT_ESQL_HARNESS_CONFIG.exemplars.k });
    expect(config.feedback).toEqual(DEFAULT_ESQL_HARNESS_CONFIG.feedback);

    Fs.unlinkSync(path);
  });

  it('falls back to the defaults when the override file is unreadable', () => {
    process.env.ESQL_HARNESS_CONFIG = Path.join(Os.tmpdir(), 'does-not-exist.json');
    expect(getEsqlHarnessConfig()).toEqual(DEFAULT_ESQL_HARNESS_CONFIG);
  });

  it('keeps head and tail when truncating an error', () => {
    const truncated = truncateHarnessError('a'.repeat(50) + 'TAIL', 20);
    expect(truncated).toContain('…[truncated]…');
    expect(truncated.endsWith('TAIL')).toBe(true);
  });

  it('leaves errors shorter than the limit untouched', () => {
    expect(truncateHarnessError('short', 100)).toBe('short');
    expect(truncateHarnessError('short', 0)).toBe('short');
  });

  it('fills template placeholders', () => {
    expect(
      renderFeedbackTemplate('{{error}} in {{query}}', { error: 'boom', query: 'FROM a' })
    ).toBe('boom in FROM a');
  });
});

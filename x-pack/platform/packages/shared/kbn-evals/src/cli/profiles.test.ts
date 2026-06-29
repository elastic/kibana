/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { isExportProfileImplicitLocal } from './profiles';

const makeReader = (flags: Record<string, string | boolean | undefined>) =>
  new FlagsReader(flags as Record<string, string | boolean>);

describe('isExportProfileImplicitLocal', () => {
  it('returns false when exportProfile is not local', () => {
    const reader = makeReader({});
    expect(isExportProfileImplicitLocal(reader, 'dev-vault')).toBe(false);
  });

  it('returns true when exportProfile is local and no explicit flag was passed', () => {
    const reader = makeReader({});
    expect(isExportProfileImplicitLocal(reader, 'local')).toBe(true);
  });

  it('returns false when --tracing-profile local was passed explicitly (new flag name)', () => {
    const reader = makeReader({ 'tracing-profile': 'local' });
    expect(isExportProfileImplicitLocal(reader, 'local')).toBe(false);
  });

  it('returns false when --export-profile local was passed explicitly (deprecated alias)', () => {
    const reader = makeReader({ 'export-profile': 'local' });
    expect(isExportProfileImplicitLocal(reader, 'local')).toBe(false);
  });

  it('returns false when --profile local was passed (base profile)', () => {
    const reader = makeReader({ profile: 'local' });
    expect(isExportProfileImplicitLocal(reader, 'local')).toBe(false);
  });
});

describe('flag alias back-compat: --evals-kbn-profile and --datasets-profile', () => {
  it('both flag names are independent string reads (old flag still parseable)', () => {
    const readerNew = makeReader({ 'evals-kbn-profile': 'dev-vault' });
    const readerOld = makeReader({ 'datasets-profile': 'dev-vault' });

    expect(readerNew.string('evals-kbn-profile')).toBe('dev-vault');
    expect(readerNew.string('datasets-profile')).toBeUndefined();

    expect(readerOld.string('datasets-profile')).toBe('dev-vault');
    expect(readerOld.string('evals-kbn-profile')).toBeUndefined();
  });

  it('new flag name takes precedence when both are provided', () => {
    const reader = makeReader({ 'evals-kbn-profile': 'new-value', 'datasets-profile': 'old-value' });
    const evalsKbnProfileNew = reader.string('evals-kbn-profile');
    const evalsKbnProfileOld = reader.string('datasets-profile');
    const resolved = evalsKbnProfileNew ?? evalsKbnProfileOld;
    expect(resolved).toBe('new-value');
  });
});

describe('flag alias back-compat: --tracing-profile and --export-profile', () => {
  it('both flag names are independent string reads (old flag still parseable)', () => {
    const readerNew = makeReader({ 'tracing-profile': 'local' });
    const readerOld = makeReader({ 'export-profile': 'local' });

    expect(readerNew.string('tracing-profile')).toBe('local');
    expect(readerNew.string('export-profile')).toBeUndefined();

    expect(readerOld.string('export-profile')).toBe('local');
    expect(readerOld.string('tracing-profile')).toBeUndefined();
  });

  it('new flag name takes precedence when both are provided', () => {
    const reader = makeReader({ 'tracing-profile': 'new-value', 'export-profile': 'old-value' });
    const tracingProfileNew = reader.string('tracing-profile');
    const tracingProfileOld = reader.string('export-profile');
    const resolved = tracingProfileNew ?? tracingProfileOld;
    expect(resolved).toBe('new-value');
  });
});

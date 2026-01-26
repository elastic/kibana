/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamIndexMode } from '@kbn/streams-schema';
import { getEsqlSourceCommand } from './esql_source_command';

describe('getEsqlSourceCommand', () => {
  it('returns "TS" for time_series index mode', () => {
    const indexMode: IngestStreamIndexMode = 'time_series';
    expect(getEsqlSourceCommand(indexMode)).toBe('TS');
  });

  it('returns "FROM" for standard index mode', () => {
    const indexMode: IngestStreamIndexMode = 'standard';
    expect(getEsqlSourceCommand(indexMode)).toBe('FROM');
  });

  it('returns "FROM" for logsdb index mode', () => {
    const indexMode: IngestStreamIndexMode = 'logsdb';
    expect(getEsqlSourceCommand(indexMode)).toBe('FROM');
  });

  it('returns "FROM" for lookup index mode', () => {
    const indexMode: IngestStreamIndexMode = 'lookup';
    expect(getEsqlSourceCommand(indexMode)).toBe('FROM');
  });

  it('returns "FROM" when index mode is undefined', () => {
    expect(getEsqlSourceCommand(undefined)).toBe('FROM');
  });
});

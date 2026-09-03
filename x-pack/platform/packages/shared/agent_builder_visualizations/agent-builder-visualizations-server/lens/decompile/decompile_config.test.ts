/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { compileConfig, isCompileSuccess } from '../compile/compile_config';
import { decompileConfig, isDecompileSuccess } from './decompile_config';
import type { ProbedColumn } from '../probe_columns';

const probed = (...columns: Array<[string, string]>): ProbedColumn[] =>
  columns.map(([name, type]) => ({ name, type }));

const QUERY = 'FROM logs | STATS count = COUNT(*) BY @timestamp';
const COLUMNS = probed(['count', 'long'], ['@timestamp', 'date']);

describe('decompileConfig', () => {
  it('extracts slots and intent from a compiled xy config', () => {
    const compiled = compileConfig({
      chartType: SupportedChartType.XY,
      query: QUERY,
      columns: COLUMNS,
      mode: 'new',
      title: 'Requests',
      intent: { legend_statistics: ['avg'] },
    });
    expect(isCompileSuccess(compiled)).toBe(true);
    if (!isCompileSuccess(compiled)) {
      return;
    }

    const decompiled = decompileConfig(compiled.config);
    expect(isDecompileSuccess(decompiled)).toBe(true);
    if (!isDecompileSuccess(decompiled)) {
      return;
    }
    expect(decompiled.query).toBe(QUERY);
    expect(decompiled.bindings).toMatchObject({
      x: '@timestamp',
      y: ['count'],
    });
    expect(decompiled.intent.legend_statistics).toEqual(['avg']);
    expect(decompiled.overrides.type).toBeUndefined();
    expect(decompiled.overrides.data_source).toBeUndefined();
  });

  it('is idempotent through compile in edit mode', () => {
    const compiled = compileConfig({
      chartType: SupportedChartType.XY,
      query: QUERY,
      columns: COLUMNS,
      mode: 'new',
      title: 'Requests',
      intent: { legend_statistics: ['avg'], units: { count: 'bytes' } },
    });
    expect(isCompileSuccess(compiled)).toBe(true);
    if (!isCompileSuccess(compiled)) {
      return;
    }

    const decompiled = decompileConfig(compiled.config);
    expect(isDecompileSuccess(decompiled)).toBe(true);
    if (!isDecompileSuccess(decompiled)) {
      return;
    }

    const again = compileConfig({
      chartType: decompiled.chartType,
      query: decompiled.query ?? QUERY,
      columns: COLUMNS,
      mode: 'edit',
      title: typeof compiled.config.title === 'string' ? compiled.config.title : undefined,
      intent: decompiled.intent,
      styleOverrides: decompiled.overrides,
    });
    expect(isCompileSuccess(again)).toBe(true);
    if (!isCompileSuccess(again)) {
      return;
    }
    expect(again.config).toEqual(compiled.config);
  });

  it('keeps intent when the caller drops overrides for a chart type change', () => {
    const compiled = compileConfig({
      chartType: SupportedChartType.XY,
      query: QUERY,
      columns: COLUMNS,
      mode: 'new',
      intent: { legend_statistics: ['max'] },
    });
    expect(isCompileSuccess(compiled)).toBe(true);
    if (!isCompileSuccess(compiled)) {
      return;
    }
    const decompiled = decompileConfig(compiled.config);
    expect(isDecompileSuccess(decompiled) && decompiled.intent.legend_statistics).toEqual(['max']);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { bindSlots, isBindOk, type SlotBindings } from './bind_slots';
import { isSupportedChartType } from '../compile/chart_schemas';
import { decompileConfig, isDecompileSuccess } from '../decompile/decompile_config';
import type { ProbedColumn } from '../probe_columns';
import {
  convertCorpusPanels,
  firstEsqlQuery,
  isEsqlConfig,
  loadLensCorpus,
} from '../test_helpers/load_lens_corpus';

const panels = loadLensCorpus();
const describeIfCorpus = panels ? describe : describe.skip;

const asSet = (values: string[] | undefined): string[] => [...new Set(values ?? [])].sort();

const probedFromBindings = (bindings: SlotBindings): ProbedColumn[] => {
  const seen = new Set<string>();
  const columns: ProbedColumn[] = [];
  const add = (name: string | undefined, type: string): void => {
    if (!name || seen.has(name)) {
      return;
    }
    seen.add(name);
    columns.push({ name, type });
  };
  for (const name of bindings.y ?? []) {
    add(name, 'long');
  }
  for (const name of bindings.metrics ?? []) {
    add(name, 'long');
  }
  add(bindings.primary, 'long');
  add(bindings.secondary, 'long');
  add(bindings.gaugeMin, 'long');
  add(bindings.gaugeMax, 'long');
  add(bindings.gaugeGoal, 'long');
  add(
    bindings.x,
    bindings.xScale === 'temporal' ? 'date' : bindings.xScale === 'linear' ? 'double' : 'keyword'
  );
  add(bindings.yDim, 'keyword');
  add(bindings.breakdown, 'keyword');
  add(bindings.tagBy, 'keyword');
  add(bindings.region, 'keyword');
  for (const name of bindings.groupBy ?? []) {
    add(name, 'keyword');
  }
  for (const name of bindings.groupBreakdownBy ?? []) {
    add(name, 'keyword');
  }
  for (const name of bindings.rows ?? []) {
    add(name, 'keyword');
  }
  for (const name of bindings.dimensions) {
    add(name, 'keyword');
  }
  for (const name of bindings.measures) {
    add(name, 'long');
  }
  return columns;
};

const agree = (persisted: SlotBindings, bound: SlotBindings): boolean => {
  switch (persisted.chartType) {
    case SupportedChartType.Metric:
      return persisted.primary === bound.primary;
    case SupportedChartType.Gauge:
      return persisted.primary === bound.primary;
    case SupportedChartType.XY:
      return (
        persisted.x === bound.x &&
        asSet(persisted.y).join() === asSet(bound.y).join() &&
        (persisted.breakdown === bound.breakdown || persisted.breakdown === persisted.x)
      );
    case SupportedChartType.Datatable:
      return (
        asSet(persisted.metrics).join() === asSet(bound.metrics).join() &&
        asSet(persisted.rows).join() === asSet(bound.rows).join()
      );
    case SupportedChartType.Pie:
    case SupportedChartType.Treemap:
    case SupportedChartType.Waffle:
      return (
        asSet(persisted.metrics).join() === asSet(bound.metrics).join() &&
        asSet(persisted.groupBy).join() === asSet(bound.groupBy).join()
      );
    default:
      return persisted.primary === bound.primary;
  }
};

describeIfCorpus('bindSlots census', () => {
  const converted = convertCorpusPanels(panels ?? []).filter((panel) => isEsqlConfig(panel.config));

  it('agrees with persisted slot accessors on unambiguous ES|QL panels', () => {
    const summary: Record<string, { total: number; unambiguous: number; agree: number }> = {};

    for (const panel of converted) {
      if (!isSupportedChartType(panel.config.type)) {
        continue;
      }
      const query = firstEsqlQuery(panel.config);
      const decompiled = decompileConfig(panel.config);
      if (!query || !isDecompileSuccess(decompiled)) {
        continue;
      }
      const type = panel.config.type;
      summary[type] ??= { total: 0, unambiguous: 0, agree: 0 };
      summary[type].total += 1;
      const bound = bindSlots(type, query, probedFromBindings(decompiled.bindings));
      if (!isBindOk(bound)) {
        continue;
      }
      summary[type].unambiguous += 1;
      if (agree(decompiled.bindings, bound.bindings)) {
        summary[type].agree += 1;
      }
    }

    expect(summary.xy.total).toBeGreaterThan(500);
    expect(summary.metric.total).toBeGreaterThan(500);
    expect(summary.xy.agree).toBe(summary.xy.unambiguous);
    expect(summary.metric.agree).toBe(summary.metric.unambiguous);
    if (summary.data_table) {
      expect(summary.data_table.agree).toBe(summary.data_table.unambiguous);
    }
    if (summary.pie) {
      expect(summary.pie.agree).toBe(summary.pie.unambiguous);
    }
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metricConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import type { KitServices } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import { corpusCases } from './__fixtures__/corpus_cases';
import { applyLensFormats, toLensFieldFormat } from './formats';
import type { LensApiFormat } from './types';

/** A format as Lens's API schema fills it in, so defaults come from Lens and not from this test. */
const parsedFormat = (format: Record<string, unknown>): LensApiFormat => {
  const [metric] = metricConfigSchemaESQL.parse({
    type: 'metric',
    data_source: { type: 'esql', query: 'FROM a' },
    metrics: [{ type: 'primary', column: 'value', format }],
  }).metrics;
  if (!metric.format) {
    throw new Error('No format parsed.');
  }
  return metric.format;
};

describe('toLensFieldFormat', () => {
  // Expected params are the ones Lens's `lens_format_column` tests and its `supportedFormats`
  // give for the same Lens state (x-pack/platform/plugins/shared/lens/common/expressions).
  it('gives a number format the pattern Lens builds from its decimals', () => {
    expect(toLensFieldFormat(parsedFormat({ type: 'number', decimals: 5 }))).toEqual({
      id: 'number',
      params: { formatOverride: true, pattern: '0,0.00000', decimals: 5 },
    });
  });

  it('special-cases 0 decimals as Lens does', () => {
    expect(toLensFieldFormat(parsedFormat({ type: 'number', decimals: 0 }))).toEqual({
      id: 'number',
      params: { formatOverride: true, pattern: '0,0', decimals: 0 },
    });
  });

  it('uses 2 decimals when the config sets none', () => {
    expect(toLensFieldFormat(parsedFormat({ type: 'number' }))).toEqual({
      id: 'number',
      params: { formatOverride: true, pattern: '0,0.00', decimals: 2 },
    });
  });

  it('wraps a suffix in the suffix formatter', () => {
    expect(toLensFieldFormat(parsedFormat({ type: 'number', decimals: 5, suffix: 'ABC' }))).toEqual(
      {
        id: 'suffix',
        params: {
          suffixString: 'ABC',
          id: 'number',
          formatOverride: true,
          params: { formatOverride: true, pattern: '0,0.00000', decimals: 5 },
        },
      }
    );
  });

  it('appends compact notation and the percent sign', () => {
    expect(
      toLensFieldFormat(parsedFormat({ type: 'percent', decimals: 1, compact: true }))
    ).toEqual({ id: 'percent', params: { formatOverride: true, pattern: '0,0.0a%', decimals: 1 } });
  });

  it('formats bits with the bytes formatter and a `bitd` pattern', () => {
    expect(toLensFieldFormat(parsedFormat({ type: 'bits', decimals: 0 }))).toEqual({
      id: 'bytes',
      params: { formatOverride: true, pattern: '0,0bitd', decimals: 0 },
    });
  });

  it('translates durations to the duration formatter params', () => {
    expect(
      toLensFieldFormat(parsedFormat({ type: 'duration', from: 'ms', to: 's', decimals: 1 }))
    ).toEqual({
      id: 'duration',
      params: {
        pattern: '',
        formatOverride: true,
        inputFormat: 'milliseconds',
        outputFormat: 'asSeconds',
        outputPrecision: 1,
        useShortSuffix: true,
        showSuffix: true,
        includeSpaceWithSuffix: true,
        decimals: 1,
      },
    });
    expect(
      toLensFieldFormat(parsedFormat({ type: 'duration', from: 's', to: 'auto-approximate' }))
    ).toMatchObject({
      id: 'duration',
      params: { inputFormat: 'seconds', outputFormat: 'humanize', useShortSuffix: false },
    });
  });

  it('formats a custom pattern as a number format', () => {
    expect(toLensFieldFormat(parsedFormat({ type: 'custom', pattern: '0.0a' }))).toEqual({
      id: 'number',
      params: { pattern: '0.0a', formatOverride: true, decimals: 0 },
    });
  });
});

describe('applyLensFormats', () => {
  let services: KitServices;
  beforeAll(async () => {
    services = await createTestKitServices();
  });

  it.each([
    ['logs4xxPercent', 'HTTP 4xx (%)'],
    ['logsBytesDistribution', 'percentage'],
  ])('gives %s the format Kibana gave its column', (name, column) => {
    const { config, table } = corpusCases[name];
    if (!table) {
      throw new Error('The case has no table.');
    }
    const layer = (config.layers as Array<Record<string, unknown>> | undefined)?.[0] ?? config;
    const metric = ((layer.metrics ?? layer.y) as Array<{ column: string; format: object }>).find(
      (ref) => ref.column === column
    );
    const expected = table.columns.find(({ id }) => id === column)?.meta.params;
    const raw = {
      ...table,
      columns: table.columns.map((col) => ({
        ...col,
        meta: { ...col.meta, params: { id: 'number' } },
      })),
    };
    const formatted = applyLensFormats(
      raw,
      new Map([[column, parsedFormat(metric?.format as Record<string, unknown>)]])
    );
    const params = formatted.columns.find(({ id }) => id === column)?.meta.params;
    expect(params).toEqual(expected);
  });

  it('formats a value as the Kibana panel showed it', () => {
    const { table, light } = corpusCases.logs4xxPercent;
    const format = toLensFieldFormat(
      parsedFormat({ type: 'percent', decimals: 2, compact: false })
    );
    const value = table?.rows[0]['HTTP 4xx (%)'];
    expect(services.registry.getInstance(format.id ?? '', format.params).convertToText(value)).toBe(
      light.metric?.texts[1]
    );
  });

  it('leaves non-number columns with the format their query gave them', () => {
    const table = {
      type: 'datatable' as const,
      columns: [
        { id: 'host', name: 'host', meta: { type: 'string' as const, params: { id: 'string' } } },
      ],
      rows: [{ host: 'a' }],
    };
    expect(applyLensFormats(table, new Map([['host', parsedFormat({ type: 'number' })]]))).toEqual(
      table
    );
  });
});

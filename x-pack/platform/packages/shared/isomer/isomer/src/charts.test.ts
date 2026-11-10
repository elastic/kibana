/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricNode } from '@elastic/isomer-primitives-charts/schema';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { intlLocaleFor, loadKibanaChartsPack, toKibanaChartsRenderContext } from './charts';

describe('toKibanaChartsRenderContext', () => {
  it("reads Kibana's dark mode, number locale and time zone", () => {
    expect(
      toKibanaChartsRenderContext({
        darkMode: true,
        numberLocale: 'de',
        dateFormatTz: 'Europe/Paris',
      })
    ).toEqual({ scheme: 'dark', locale: 'de', timeZone: 'Europe/Paris' });
  });

  it('takes Browser as the browser time zone, or UTC without one, and system dark mode as given', () => {
    expect(toKibanaChartsRenderContext({ darkMode: 'system', dateFormatTz: 'Browser' })).toEqual({
      scheme: 'light',
      locale: 'en',
      timeZone: 'UTC',
    });
    expect(
      toKibanaChartsRenderContext({
        darkMode: 'system',
        systemDark: true,
        dateFormatTz: 'Browser',
        browserTimeZone: 'Asia/Tokyo',
      })
    ).toEqual({ scheme: 'dark', locale: 'en', timeZone: 'Asia/Tokyo' });
  });
});

describe('intlLocaleFor', () => {
  it.each([
    ['en', 'en'],
    ['zh-cn', 'zh-CN'],
    ['chs', 'zh-Hans'],
    [undefined, 'en'],
    ['not a locale!', 'en'],
  ])('maps %s to %s', (numeral, intl) => {
    expect(intlLocaleFor(numeral)).toBe(intl);
  });
});

describe('loadKibanaChartsPack', () => {
  const node: MetricNode = {
    type: 'metric',
    data: {
      columns: [
        { id: 'v', label: 'Bytes', type: 'number', role: 'metric', format: { kind: 'number' } },
      ],
      rows: [[1234.5]],
    },
    value: { column: 'v' },
  };

  it("resolves charts in Kibana's render context when the render names none", async () => {
    let context = { locale: 'de', timeZone: 'UTC' };
    const pack = await loadKibanaChartsPack({
      environment: 'server',
      getRenderContext: () => context,
    });
    const runtime = createIsomerRuntime({ packs: [pack] });
    const text = () => runtime.surfaces.text.render({ type: 'view', body: [node] });
    expect(text()).toContain('1.234,5');
    context = { locale: 'en', timeZone: 'UTC' };
    expect(text()).toContain('1,234.5');
  });

  it('registers the browser engine in a browser', async () => {
    const pack = await loadKibanaChartsPack({ environment: 'browser' });
    expect(pack.primitives.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['metric', 'xyChart', 'grid', 'unsupported'])
    );
  });
});

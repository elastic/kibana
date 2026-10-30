/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { createKibanaIsomerRuntime } from '@kbn/isomer';
import type { MarkdownNode } from '@kbn/isomer-components';
import { vegaExample, type VegaNode } from '@kbn/isomer-primitives-vega';
import { IsomerPlugin } from './plugin';
import { describeVocabulary } from './vocabulary';

jest.mock('@kbn/isomer', () => {
  const actual = jest.requireActual('@kbn/isomer');
  return { ...actual, createKibanaIsomerRuntime: jest.fn(actual.createKibanaIsomerRuntime) };
});

const startPlugin = (
  renderService: { url?: string; timeoutMs: number } = { timeoutMs: 60_000 }
) => {
  const plugin = new IsomerPlugin(
    coreMock.createPluginInitializerContext({ charts: { serverDraw: false }, renderService })
  );
  plugin.setup(coreMock.createSetup());
  return plugin.start();
};

const markdown: MarkdownNode = { type: 'markdown', text: 'There are **3** open alerts.' };
const composition = { type: 'view' as const, body: [markdown] };

const vegaComposition = { type: 'view' as const, body: [vegaExample] };

const fetching: VegaNode = {
  ...vegaExample,
  spec: { ...vegaExample.spec, data: { url: 'https://example.com' } },
};

describe('IsomerPlugin', () => {
  beforeEach(() => {
    jest.mocked(createKibanaIsomerRuntime).mockClear();
  });

  it('builds the runtime on the first getRuntime call and shares it after', async () => {
    const { getRuntime } = startPlugin();
    expect(createKibanaIsomerRuntime).not.toHaveBeenCalled();
    const [first, second] = await Promise.all([getRuntime(), getRuntime()]);
    expect(first).toBe(second);
    expect(await getRuntime()).toBe(first);
    expect(createKibanaIsomerRuntime).toHaveBeenCalledTimes(1);
  });

  it('builds the runtime again after a failed attempt', async () => {
    jest.mocked(createKibanaIsomerRuntime).mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const { getRuntime } = startPlugin();
    await expect(getRuntime()).rejects.toThrow('boom');
    await expect(getRuntime()).resolves.toBeDefined();
    expect(createKibanaIsomerRuntime).toHaveBeenCalledTimes(2);
  });

  it('starts a runtime that validates markdown nodes', async () => {
    const runtime = await startPlugin().getRuntime();
    expect(runtime.validate(composition).errors).toEqual([]);
    const empty: MarkdownNode = { ...markdown, text: '' };
    const { errors } = runtime.validate({ type: 'view', body: [empty] });
    expect(errors.map(({ path }) => path)).toEqual(['body[0].text']);
  });

  it('renders a markdown node on html, text, markdown, and Slack', async () => {
    const { surfaces } = await startPlugin().getRuntime();
    expect(surfaces.html.render(composition).html).toContain('<strong>3</strong>');
    expect(surfaces.text.render(composition)).toContain('There are **3** open alerts.');
    expect(surfaces.markdown.render(composition)).toContain('There are **3** open alerts.');
    expect(JSON.stringify(surfaces.slack.render(composition).blocks)).toContain('open alerts');
  });

  it('starts a runtime that validates vega nodes', async () => {
    const runtime = await startPlugin().getRuntime();
    expect(runtime.validate(vegaComposition).errors).toEqual([]);
    const { errors } = runtime.validate({ type: 'view', body: [fetching] });
    expect(errors.map(({ path }) => path)).toEqual(['body[0].spec.data.url']);
  });

  it('renders a vega node on html, text, markdown, and Slack', async () => {
    const { surfaces } = await startPlugin().getRuntime();
    expect(surfaces.html.render(vegaComposition).html).toContain('<svg');
    expect(surfaces.text.render(vegaComposition)).toContain(vegaExample.caption);
    expect(surfaces.markdown.render(vegaComposition)).toContain('| day | errors |');
    expect(JSON.stringify(surfaces.slack.render(vegaComposition).blocks)).toContain(
      vegaExample.caption
    );
  });

  it('rejects getDrawing while server drawing is off', async () => {
    await expect(startPlugin().getDrawing()).rejects.toThrow('Server drawing is off');
  });

  it('rejects getRenderHost with neither server drawing nor a render service', async () => {
    await expect(startPlugin().getRenderHost()).rejects.toThrow(
      'set xpack.isomer.charts.serverDraw or xpack.isomer.renderService.url'
    );
  });

  it('draws in the render service when one is configured, naming the vocabulary it composes in', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    try {
      const { getRenderHost, getRuntime } = startPlugin({
        url: 'http://render.test:3000',
        timeoutMs: 60_000,
      });
      const host = await getRenderHost();
      expect(host.pid).toBeUndefined();
      expect([...(await host.drawPng(composition, { width: 400 }))]).toEqual([1, 2, 3]);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://render.test:3000/v1/render-composition');
      const body = JSON.parse(init?.body as string);
      expect(body.options).toEqual({ width: 400, format: 'png' });
      expect(body.expects).toEqual({
        vocabulary: describeVocabulary(await getRuntime()).vocabulary,
      });
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

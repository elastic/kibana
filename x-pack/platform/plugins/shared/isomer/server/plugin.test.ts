/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { createKibanaIsomerRuntime } from '@kbn/isomer';
import type { MarkdownNode } from '@kbn/isomer-components';
import { IsomerPlugin } from './plugin';

jest.mock('@kbn/isomer', () => {
  const actual = jest.requireActual('@kbn/isomer');
  return { ...actual, createKibanaIsomerRuntime: jest.fn(actual.createKibanaIsomerRuntime) };
});

const startPlugin = () => {
  const plugin = new IsomerPlugin(coreMock.createPluginInitializerContext({}));
  plugin.setup();
  return plugin.start();
};

const markdown: MarkdownNode = { type: 'markdown', text: 'There are **3** open alerts.' };
const composition = { type: 'view' as const, body: [markdown] };

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
});

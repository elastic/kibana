/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { MarkdownNode } from '@kbn/isomer-components';
import { IsomerPlugin } from './plugin';

const startRuntime = () => {
  const plugin = new IsomerPlugin(coreMock.createPluginInitializerContext({ enabled: true }));
  plugin.setup();
  return plugin.start().runtime;
};

const markdown: MarkdownNode = { type: 'markdown', text: 'There are **3** open alerts.' };
const composition = { type: 'view' as const, body: [markdown] };

describe('IsomerPlugin', () => {
  it('starts a runtime that validates markdown nodes', () => {
    const runtime = startRuntime();
    expect(runtime.validate(composition).errors).toEqual([]);
    const empty: MarkdownNode = { ...markdown, text: '' };
    const { errors } = runtime.validate({ type: 'view', body: [empty] });
    expect(errors.map(({ path }) => path)).toEqual(['body[0].text']);
  });

  it('renders a markdown node on html, text, markdown, and Slack', () => {
    const { surfaces } = startRuntime();
    expect(surfaces.html.render(composition).html).toContain('<strong>3</strong>');
    expect(surfaces.text.render(composition)).toContain('There are **3** open alerts.');
    expect(surfaces.markdown.render(composition)).toContain('There are **3** open alerts.');
    expect(JSON.stringify(surfaces.slack.render(composition).blocks)).toContain('open alerts');
  });
});

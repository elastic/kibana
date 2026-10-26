/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { buildJsxShim } from '@elastic/isomer-sdk/author';
import type { SlackRichTextBlock, SlackRichTextPreformatted } from '@elastic/isomer-sdk/slack';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { CodeNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Code, Composition, toComposition } = buildJsxShim(componentsPrimitives);

const codeOf = (text: string, language?: string): CodeNode => ({
  type: 'code',
  text,
  ...(language ? { language } : {}),
});

const view = (node: CodeNode) => validate({ type: 'view', body: [node] });

describe('code', () => {
  it('takes up to 12,000 characters and a lowercase language', () => {
    expect(view(codeOf('x'.repeat(12000))).valid).toBe(true);
    expect(view(codeOf('x'.repeat(12001))).valid).toBe(false);
    expect(view(codeOf(' \n ')).valid).toBe(false);
    expect(view(codeOf('FROM logs', 'esql')).valid).toBe(true);
    expect(view(codeOf('FROM logs', 'ES|QL')).valid).toBe(false);
    expect(view(codeOf('FROM logs', 'js onload=alert(1)')).valid).toBe(false);
  });

  it('renders one Slack preformatted rich_text block, unescaped', () => {
    const text = 'FROM logs\n| WHERE a < b & c\n| EVAL s = "```"';

    expect(surfaces.slack.renderNode(codeOf(text, 'esql')).blocks).toEqual([
      {
        type: 'rich_text',
        elements: [{ type: 'rich_text_preformatted', elements: [{ type: 'text', text }] }],
      },
    ]);
  });

  it('keeps long code whole in Slack, across split elements', () => {
    const text = Array.from({ length: 600 }, (_, index) => `| EVAL f${index} = ${index}`).join(
      '\n'
    );
    const { blocks } = surfaces.slack.renderNode(codeOf(text.slice(0, 12000)));
    const printed = (blocks as SlackRichTextBlock[])
      .flatMap(({ elements }) => elements as SlackRichTextPreformatted[])
      .flatMap(({ elements }) => elements)
      .map((inline) => ('text' in inline ? inline.text : ''))
      .join('');

    expect(printed).toBe(text.slice(0, 12000));
  });

  it('fences Markdown longer than any backtick run, with the language', () => {
    expect(surfaces.markdown.renderNode(codeOf('a ``` b', 'esql'))).toBe('````esql\na ``` b\n````');
  });

  it('renders the code as written in text and React', () => {
    const node = codeOf('  <a> &\n    b', 'json');

    expect(surfaces.text.renderNode(node)).toBe('  <a> &\n    b');
    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toBe(
      '<pre class="componentsCode-root"><code data-language="json">  &lt;a&gt; &amp;\n    b</code></pre>'
    );
  });

  it('is authored from its text children, dedented', () => {
    expect(
      toComposition(
        <Composition>
          <Code language="esql">{`
            FROM logs-*
            | LIMIT 10
          `}</Code>
        </Composition>
      ).body
    ).toEqual([codeOf('FROM logs-*\n| LIMIT 10', 'esql')]);
  });
});

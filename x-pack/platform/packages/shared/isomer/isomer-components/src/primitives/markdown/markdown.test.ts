/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { componentsPack } from '../../pack';
import type { MarkdownNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });

const node = (text: string): MarkdownNode => ({ type: 'markdown', text });
const view = (text: string) => ({ type: 'view' as const, body: [node(text)] });
const react = (text: string) => renderToStaticMarkup(surfaces.react.renderNode(node(text)));
const html = (text: string) => surfaces.html.render(view(text)).html;

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('markdown', () => {
  it('rejects empty text', () => {
    expect(validate(view('')).errors.map(({ path }) => path)).toEqual(['body[0].text']);
  });

  it('renders GFM tables and emphasis to React', () => {
    const markup = react('**bold**\n\n| a | b |\n| - | - |\n| 1 | 2 |');

    expect(markup).toContain('<strong>bold</strong>');
    expect(markup).toContain('<table>');
  });

  it('renders raw HTML as text and drops unsafe links in React', () => {
    const markup = react('<script>alert(1)</script> [x](data:text/html,hi)');

    expect(markup).not.toContain('<script');
    expect(markup).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(markup).not.toContain('data:');
  });

  it('renders headings, code, and tight and loose lists to React', () => {
    expect(react('## Title')).toContain('<h2>Title</h2>');
    expect(react('```js\nconst a = 1;\n```')).toContain(
      '<pre><code class="language-js">const a = 1;</code></pre>'
    );
    expect(react('- a\n- b')).toContain('<ul><li>a</li><li>b</li></ul>');
    expect(react('- a\n\n- b')).toContain('<li><p>a</p></li>');
    expect(react('3. a\n4. b')).toContain('<ol start="3">');
  });

  it('renders task list items as disabled checkboxes', () => {
    const markup = react('- [x] done');

    expect(markup).toMatch(/<input type="checkbox"[^>]* disabled=""[^>]* checked=""\/> done/);
  });

  it('resolves reference links through their definitions', () => {
    const markup = react('[docs][1]\n\n[1]: https://www.elastic.co "Elastic"');

    expect(markup).toContain('<a href="https://www.elastic.co" title="Elastic">docs</a>');
    expect(react('[docs][missing]')).not.toContain('<a');
  });

  it('resolves duplicate definitions to the first one', () => {
    const markup = react('[docs][x]\n\n[x]: https://first.example\n[x]: https://second.example');

    expect(markup).toContain('<a href="https://first.example">docs</a>');
    expect(markup).not.toContain('second.example');
  });

  it('renders table rows with the cells they were authored with', () => {
    const markup = react('| a | b |\n| - | - |\n| 1 |\n| 1 | 2 | 3 |');

    expect(markup).toContain('<tr><td>1</td></tr>');
    expect(markup).toContain('<tr><td>1</td><td>2</td><td>3</td></tr>');
  });

  it('renders footnotes as their labels, the way Markdown and Slack read them', () => {
    const markup = react('Text[^a].\n\n[^a]: Alpha.');

    expect(markup).toContain('<p>Text[^a].</p><p>[^a]: Alpha.</p>');
    expect(markup).not.toContain('<sup');
  });

  it('never loads react-markdown, which the server build cannot require', () => {
    jest.isolateModules(() => {
      jest.doMock('react-markdown', () => {
        throw new Error('react-markdown was loaded');
      });
      expect(() => jest.requireActual('.')).not.toThrow();
    });
  });

  it('uses the asset policy for images and the navigation policy for links', () => {
    const image = `![dot](${PNG})`;
    const link = `[dot](${PNG})`;

    expect(react(image)).toContain(`src="${PNG}"`);
    expect(html(image)).toContain(`src="${PNG}"`);
    expect(react(link)).not.toContain(PNG);
    expect(html(link)).not.toContain(PNG);
    expect(surfaces.markdown.render(view(image))).toContain(PNG);
  });

  it('keeps a destination the parser has already decoded once', () => {
    const text = '[ok](https://example.com/?a=&amp;lt;x&amp;gt;)';
    const href = 'href="https://example.com/?a=&amp;lt;x&amp;gt;"';

    expect(react(text)).toContain(href);
    expect(html(text)).toContain(href);
    expect(react('[ok](https://example.com/?a=1&b=2)')).toContain(
      'href="https://example.com/?a=1&amp;b=2"'
    );
    expect(surfaces.markdown.render(view(text))).toContain(
      'https://example.com/?a=&amp;lt;x&amp;gt;'
    );
  });

  it('renders source past the parse budget as inert text', () => {
    const quoted = `${'> '.repeat(3000)}x`;
    const hostile = `<script>alert(1)</script>${'a'.repeat(20_000)}`;

    expect(react(quoted)).not.toContain('<blockquote');
    expect(react(quoted)).toContain('&gt; ');
    expect(react(quoted)).toContain('x');
    expect(html(quoted)).not.toContain('<blockquote');
    expect(react(hostile)).not.toContain('<script');
    expect(html(hostile)).not.toContain('<script');
    expect(react(`${'*'.repeat(3000)}x`)).not.toContain('<strong');
    expect(react('> x')).toContain('<blockquote');
  });

  it('renders a GFM table as a Slack table block', () => {
    const { blocks } = surfaces.slack.render(view('| a | b |\n| - | - |\n| 1 | 2 |'));

    expect(blocks.map(({ type }) => type)).toContain('table');
  });

  it('keeps the source on text and markdown', () => {
    expect(surfaces.text.render(view('There are **3** alerts.'))).toContain(
      'There are **3** alerts.'
    );
    expect(surfaces.markdown.render(view('There are **3** alerts.'))).toContain(
      'There are **3** alerts.'
    );
  });
});

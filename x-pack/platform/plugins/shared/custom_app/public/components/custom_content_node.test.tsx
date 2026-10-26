/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, screen, waitFor } from '@testing-library/react';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { RunQuery } from '../data/data_layer';
import { ACCENT_COLORS } from '../theme/page_theme';
import { renderApp } from './test_utils';

const TEMPLATE =
  '<p>{% for row in rows %}<b>{{ row["service"].value }}</b>{% endfor %}</p>{% if rows.size == 0 %}<i>none</i>{% endif %}';

const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async () => ({
  columns: [{ name: 'service', type: 'keyword' }],
  rows: [['checkout'], ['cart']],
}));

const documentWith = (node: Record<string, unknown> = {}) =>
  appDocumentSchema.parse({
    root: {
      type: 'custom_content',
      id: 'board',
      query: 'FROM status',
      template: TEMPLATE,
      ...node,
    },
  });

const frame = async () =>
  (await screen.findByTestId('customAppCustomContentFrame')) as HTMLIFrameElement;

describe('the custom content node', () => {
  beforeEach(() => runQuery.mockClear());

  it('fills the template with the rows of its query', async () => {
    await renderApp(documentWith(), runQuery);

    const { srcdoc } = await frame();
    expect(srcdoc).toContain('<b>checkout</b>');
    expect(srcdoc).toContain('<b>cart</b>');
  });

  it('shows it in a frame that can do nothing: no scripts, no same-origin, no forms', async () => {
    await renderApp(documentWith(), runQuery);

    // An empty sandbox attribute is the strictest there is.
    expect((await frame()).getAttribute('sandbox')).toBe('');
  });

  it('cleans the markup before it is shown, whoever wrote it', async () => {
    await renderApp(
      documentWith({ template: '<p onclick="alert(1)">hi</p><img src="x" onerror="alert(2)">' }),
      runQuery
    );

    const { srcdoc } = await frame();
    expect(srcdoc).toContain('hi');
    expect(srcdoc).not.toContain('onclick');
    expect(srcdoc).not.toContain('onerror');
  });

  describe('in a page with a theme', () => {
    const themed = (theme: Record<string, unknown>) =>
      appDocumentSchema.parse({
        theme,
        root: {
          type: 'custom_content',
          id: 'board',
          query: 'FROM status',
          template: TEMPLATE,
        },
      });

    it('takes the accent of the page as its main colour, which is what a template is told to use', async () => {
      await renderApp(themed({ accent: 'purple' }), runQuery, undefined, { framed: true });

      const { srcdoc } = await frame();
      expect(srcdoc).toContain(`--cc-color-primary:${ACCENT_COLORS.purple.fill}`);
    });

    it('takes the corners of the page, for the cards and the small elements of a template', async () => {
      await renderApp(themed({ shape: 'soft' }), runQuery, undefined, { framed: true });

      const { srcdoc } = await frame();
      expect(srcdoc).toContain('--cc-radius:14px');
      expect(srcdoc).toContain('--cc-radius-s:8px');
    });

    it('is as Kibana draws it for a page with no theme', async () => {
      await renderApp(documentWith(), runQuery, undefined, { framed: true });

      const { srcdoc } = await frame();
      expect(srcdoc).not.toContain(ACCENT_COLORS.purple.fill);
      expect(srcdoc).not.toContain('--cc-radius:14px');
    });
  });

  const measure = async (scrollHeight: number) => {
    const measuring = (await screen.findByTestId(
      'customAppCustomContentMeasure'
    )) as HTMLIFrameElement;
    // jsdom does not lay a document out, so it is given the height a browser would find.
    Object.defineProperty(measuring, 'contentDocument', {
      configurable: true,
      get: () => ({ documentElement: { scrollHeight } }),
    });
    await act(async () => {
      measuring.dispatchEvent(new Event('load'));
    });
  };

  it('is as tall as it measures, whatever the model said it would be', async () => {
    await renderApp(documentWith({ height: 900 }), runQuery);
    expect(await frame()).toHaveStyle({ height: '900px' });

    await measure(212.4);

    expect(await frame()).toHaveStyle({ height: '213px' });
  });

  it('is as tall as it declared until it is measured, or a default when it declared nothing', async () => {
    const { unmount } = await renderApp(documentWith({ height: 480 }), runQuery);
    expect(await frame()).toHaveStyle({ height: '480px' });
    unmount();

    await renderApp(documentWith(), runQuery);
    expect(await frame()).toHaveStyle({ height: '320px' });
  });

  it('does not trust a measurement of a document that collapsed', async () => {
    await renderApp(documentWith({ height: 480 }), runQuery);

    await measure(1);

    expect(await frame()).toHaveStyle({ height: '480px' });
  });

  it('measures in a frame that can read nothing but its height: no scripts, and it is hidden', async () => {
    await renderApp(documentWith(), runQuery);

    const measuring = await screen.findByTestId('customAppCustomContentMeasure');
    expect(measuring.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(measuring.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('shows a template with no query as it is, and asks for no data', async () => {
    await renderApp(documentWith({ query: undefined, template: '<p>static</p>' }), runQuery);

    expect((await frame()).srcdoc).toContain('<p>static</p>');
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('leaves what to say about no rows to the template, which can handle it', async () => {
    runQuery.mockResolvedValueOnce({ columns: [{ name: 'service', type: 'keyword' }], rows: [] });
    await renderApp(documentWith(), runQuery);

    expect((await frame()).srcdoc).toContain('<i>none</i>');
    expect(screen.queryByText('No results found')).not.toBeInTheDocument();
  });

  it('says why when the query fails, instead of showing an empty frame', async () => {
    runQuery.mockRejectedValueOnce(new Error('Unknown column [nope]'));
    await renderApp(documentWith(), runQuery);

    await waitFor(() => expect(screen.getByText(/Unknown column \[nope\]/)).toBeInTheDocument());
    expect(screen.queryByTestId('customAppCustomContentFrame')).not.toBeInTheDocument();
  });
});

describe('a page whose accent is picked by a control', () => {
  it('changes colour when the person picks another accent', async () => {
    const document = appDocumentSchema.parse({
      state: { look: { type: 'string', default: 'purple' } },
      theme: { accentFrom: 'look' },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          {
            type: 'button_group',
            id: 'picker',
            label: 'Accent',
            bind: 'look',
            options: [
              { value: 'purple', label: 'Purple' },
              { value: 'teal', label: 'Teal' },
            ],
          },
          { type: 'custom_content', id: 'board', template: '<p>hi</p>' },
        ],
      },
    });
    const { runtime } = await renderApp(document, runQuery, undefined, { framed: true });
    expect((await frame()).srcdoc).toContain(`--cc-color-primary:${ACCENT_COLORS.purple.fill}`);

    act(() => {
      runtime.run([{ type: 'setState', key: 'look', value: 'teal' }]);
    });

    await waitFor(async () =>
      expect((await frame()).srcdoc).toContain(`--cc-color-primary:${ACCENT_COLORS.teal.fill}`)
    );
  });
});

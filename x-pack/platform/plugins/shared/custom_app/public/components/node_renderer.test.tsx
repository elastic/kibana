/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import { appDocumentSchema, type AppNode } from '@kbn/custom-app-common';
import { NodeRenderer } from './node_renderer';
import { renderWithRuntime } from './test_utils';

const parseRoot = (root: unknown): AppNode => appDocumentSchema.parse({ root }).root;

describe('NodeRenderer', () => {
  it('renders nested nodes with their content', () => {
    const root = parseRoot({
      type: 'stack',
      id: 'root',
      children: [
        { type: 'heading', id: 'title', text: 'Service health' },
        { type: 'text', id: 'body', text: 'All systems nominal' },
        { type: 'callout', id: 'note', title: 'Heads up', text: 'Maintenance tonight' },
      ],
    });

    renderWithRuntime(<NodeRenderer node={root} />);

    expect(screen.getByRole('heading', { name: 'Service health' })).toBeInTheDocument();
    expect(screen.getByText('All systems nominal')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Maintenance tonight')).toBeInTheDocument();
  });

  it('tags every rendered node with its id so the editor can select it', () => {
    const root = parseRoot({
      type: 'stack',
      id: 'root',
      children: [{ type: 'text', id: 'body', text: 'hi' }],
    });

    const { container } = renderWithRuntime(<NodeRenderer node={root} />);

    expect(container.querySelector('[data-node-id="root"]')).not.toBeNull();
    expect(container.querySelector('[data-node-id="body"]')).not.toBeNull();
  });

  it('shows a placeholder for a node type it cannot render instead of failing', () => {
    const unknownNode = { type: 'sparkles', id: 'x' } as unknown as AppNode;

    renderWithRuntime(<NodeRenderer node={unknownNode} />);

    expect(screen.getByText('This component is not supported')).toBeInTheDocument();
    expect(screen.getByText(/"sparkles" is unknown/)).toBeInTheDocument();
  });

  describe('a text, which is written in Markdown', () => {
    const show = (text: string, state: Record<string, unknown> = {}) => {
      const document = appDocumentSchema.parse({ state, root: { type: 'text', id: 't', text } });
      return renderWithRuntime(<NodeRenderer node={document.root} />, document);
    };

    it('shows bold text as bold and a list as a list, not the marks that were written', () => {
      const { container } = show('**What to do next**\n\n- page the lead\n- open a war room');

      expect(screen.getByText('What to do next').tagName).toBe('STRONG');
      expect(screen.getAllByRole('listitem').map(({ textContent }) => textContent)).toEqual([
        'page the lead',
        'open a war room',
      ]);
      expect(container.textContent).not.toContain('**');
      expect(container.textContent).not.toContain('- page');
    });

    it('still shows plain text as it is', () => {
      show('All systems nominal');

      expect(screen.getByText('All systems nominal')).toBeInTheDocument();
    });

    it('shows a link as a link', () => {
      show('See [the runbook](https://example.com/runbook)');

      expect(screen.getByRole('link', { name: /the runbook/ })).toHaveAttribute(
        'href',
        'https://example.com/runbook'
      );
    });

    it('does not show HTML that was written in it as HTML', () => {
      const { container } = show('<img src=x onerror=alert(1)> hello');

      expect(container.querySelector('img')).toBeNull();
    });

    it('puts a value of the app in as it is, so one cannot bring formatting or a link with it', () => {
      const { container } = show('Service {{state.service}}', {
        service: {
          type: 'string',
          default: '**bold** [click](https://evil.example) https://bare.example www.bare.example',
        },
      });

      expect(container.querySelector('strong')).toBeNull();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(container.textContent?.replace(/\u200b/g, '')).toContain(
        '**bold** [click](https://evil.example) https://bare.example www.bare.example'
      );
    });

    it('shows a value that cannot start a list or a heading by what it holds', () => {
      const { container } = show('{{state.note}}', {
        note: { type: 'string', default: '# heading\n- item' },
      });

      expect(container.querySelector('h1')).toBeNull();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });
  });

  describe('interpolation', () => {
    const document = appDocumentSchema.parse({
      state: { service: { type: 'string', default: 'checkout' } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'heading', id: 'h', text: 'Service {{state.service}}' },
          { type: 'text', id: 't', text: 'Showing {{state.service}} errors' },
          {
            type: 'callout',
            id: 'c',
            title: 'About {{state.service}}',
            text: 'See {{state.service}}',
          },
        ],
      },
    });

    it('fills state values into every text prop', () => {
      renderWithRuntime(<NodeRenderer node={document.root} />, document);

      expect(screen.getByRole('heading', { name: 'Service checkout' })).toBeInTheDocument();
      expect(screen.getByText('Showing checkout errors')).toBeInTheDocument();
      expect(screen.getByText('About checkout')).toBeInTheDocument();
      expect(screen.getByText('See checkout')).toBeInTheDocument();
    });

    it('updates the text when the state changes', () => {
      const { runtime } = renderWithRuntime(<NodeRenderer node={document.root} />, document);

      act(() => {
        runtime.run([{ type: 'setState', key: 'service', value: 'cart' }]);
      });

      expect(screen.getByRole('heading', { name: 'Service cart' })).toBeInTheDocument();
    });

    it('shows a state value that contains markup as plain text', () => {
      const { runtime, container } = renderWithRuntime(
        <NodeRenderer node={document.root} />,
        document
      );
      const hostile = '<img src=x onerror=alert(1)><b>bold</b>';

      act(() => {
        runtime.run([{ type: 'setState', key: 'service', value: hostile }]);
      });

      expect(screen.getByText(`Showing ${hostile} errors`)).toBeInTheDocument();
      expect(container.querySelector('img, b')).toBeNull();
    });
  });

  describe('layout', () => {
    const state = { q: { type: 'string', default: '' } };
    const stackOf = (direction: string, children: unknown[]) =>
      appDocumentSchema.parse({
        state,
        root: { type: 'stack', id: 'root', direction, children },
      }).root;

    const search = { type: 'search', id: 'find', label: 'Find', bind: 'q' };
    const select = {
      type: 'select',
      id: 'pick',
      label: 'Pick',
      bind: 'q',
      options: [{ value: 'a' }],
    };

    const renderLayout = (root: AppNode) =>
      renderWithRuntime(
        <NodeRenderer node={root} />,
        appDocumentSchema.parse({ state, root: { type: 'text', id: 'x', text: 'x' } })
      );

    it('draws a row of inputs as a filter bar', () => {
      renderLayout(stackOf('horizontal', [search, select]));

      expect(screen.getByTestId('customAppFilterBar')).toBeInTheDocument();
    });

    it('does not make a filter bar of a row that holds anything else', () => {
      renderLayout(stackOf('horizontal', [search, { type: 'text', id: 't', text: 'hi' }]));
      expect(screen.queryByTestId('customAppFilterBar')).not.toBeInTheDocument();
    });

    it('does not make a filter bar of a column of inputs, or of an empty row', () => {
      renderLayout(stackOf('vertical', [search, select]));
      expect(screen.queryByTestId('customAppFilterBar')).not.toBeInTheDocument();
    });

    it('does not make a filter bar of an empty row', () => {
      renderLayout(stackOf('horizontal', []));
      expect(screen.queryByTestId('customAppFilterBar')).not.toBeInTheDocument();
    });

    it('keeps a status and a button together at the start of a row, and does not spread them', () => {
      renderLayout(
        stackOf('horizontal', [
          { type: 'badge', id: 'b', text: 'Country: US' },
          { type: 'button', id: 'go', label: 'Clear' },
          search,
        ])
      );

      const itemOf = (element: HTMLElement) => element.closest('.euiFlexItem')?.className ?? '';
      expect(itemOf(screen.getByText('Country: US'))).toMatch(/growZero/);
      expect(itemOf(screen.getByText('Clear'))).toMatch(/growZero/);
      expect(itemOf(screen.getByRole('searchbox'))).not.toMatch(/growZero/);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { appDocumentSchema, type AppNode } from '@kbn/custom-app-common';
import { NodeRenderer } from './node_renderer';

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

    render(<NodeRenderer node={root} />);

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

    const { container } = render(<NodeRenderer node={root} />);

    expect(container.querySelector('[data-node-id="root"]')).not.toBeNull();
    expect(container.querySelector('[data-node-id="body"]')).not.toBeNull();
  });

  it('shows a placeholder for a node type it cannot render instead of failing', () => {
    const unknownNode = { type: 'sparkles', id: 'x' } as unknown as AppNode;

    render(<NodeRenderer node={unknownNode} />);

    expect(screen.getByText('This component is not supported')).toBeInTheDocument();
    expect(screen.getByText(/"sparkles" is unknown/)).toBeInTheDocument();
  });
});

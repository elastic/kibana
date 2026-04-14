/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { A2UISurfaceAttachmentData } from '@kbn/agent-builder-common/attachments';
import { KIBANA_EUI_CATALOG_ID } from '@kbn/agent-builder-common/attachments';
import { A2UIRenderer } from './a2ui_renderer';

const createSurface = (
  overrides: Partial<A2UISurfaceAttachmentData> = {}
): A2UISurfaceAttachmentData => ({
  surface_id: 'test',
  catalog_id: KIBANA_EUI_CATALOG_ID,
  components: [{ id: 'root', component: 'Text', text: 'Hello' }],
  ...overrides,
});

describe('A2UIRenderer', () => {
  it('renders a simple text component', () => {
    const surface = createSurface();
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders error message when root is missing', () => {
    const surface = createSurface({
      components: [{ id: 'not_root', component: 'Text', text: 'Hi' }],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText(/missing root component/)).toBeInTheDocument();
  });

  it('renders nested children via Column and Row', () => {
    const surface = createSurface({
      components: [
        { id: 'root', component: 'Column', children: ['row1'] },
        { id: 'row1', component: 'Row', children: ['text1', 'text2'] },
        { id: 'text1', component: 'Text', text: 'Left' },
        { id: 'text2', component: 'Text', text: 'Right' },
      ],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
  });

  it('resolves data-bound values from the data model', () => {
    const surface = createSurface({
      components: [{ id: 'root', component: 'Text', text: { path: '/greeting' } }],
      data_model: { greeting: 'Hello from data model' },
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Hello from data model')).toBeInTheDocument();
  });

  it('renders Stat component with title and value', () => {
    const surface = createSurface({
      components: [
        {
          id: 'root',
          component: 'Stat',
          title: 'CPU Usage',
          value: '72%',
          description: 'Average',
        },
      ],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  it('renders Stat with data-bound value', () => {
    const surface = createSurface({
      components: [
        {
          id: 'root',
          component: 'Stat',
          title: 'Memory',
          value: { path: '/mem' },
        },
      ],
      data_model: { mem: '4.2 GB' },
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('4.2 GB')).toBeInTheDocument();
  });

  it('renders Badge with text', () => {
    const surface = createSurface({
      components: [{ id: 'root', component: 'Badge', text: 'Active', color: 'success' }],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders DescriptionList with items', () => {
    const surface = createSurface({
      components: [
        {
          id: 'root',
          component: 'DescriptionList',
          items: [
            { title: 'Host', description: 'web-01' },
            { title: 'Status', description: { path: '/status' } },
          ],
        },
      ],
      data_model: { status: 'healthy' },
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('web-01')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('renders Card with child', () => {
    const surface = createSurface({
      components: [
        { id: 'root', component: 'Card', child: 'inner', title: 'My Card' },
        { id: 'inner', component: 'Text', text: 'Card content' },
      ],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('My Card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders Button with text', () => {
    const surface = createSurface({
      components: [{ id: 'root', component: 'Button', text: 'Click me' }],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders Divider without error', () => {
    const surface = createSurface({
      components: [
        { id: 'root', component: 'Column', children: ['text1', 'divider', 'text2'] },
        { id: 'text1', component: 'Text', text: 'Above' },
        { id: 'divider', component: 'Divider' },
        { id: 'text2', component: 'Text', text: 'Below' },
      ],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Above')).toBeInTheDocument();
    expect(screen.getByText('Below')).toBeInTheDocument();
  });

  it('renders Text with title variant', () => {
    const surface = createSurface({
      components: [{ id: 'root', component: 'Text', text: 'Title Text', variant: 'title' }],
    });
    const { container } = render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Title Text')).toBeInTheDocument();
    expect(container.querySelector('h3')).toBeInTheDocument();
  });

  it('silently skips unknown component types', () => {
    const surface = createSurface({
      components: [
        { id: 'root', component: 'Column', children: ['known', 'unknown_comp'] },
        { id: 'known', component: 'Text', text: 'Visible' },
        { id: 'unknown_comp', component: 'FancyWidget' },
      ],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('handles empty data_model gracefully', () => {
    const surface = createSurface({
      components: [{ id: 'root', component: 'Text', text: { path: '/missing' } }],
    });
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByTestId('a2uiSurface')).toBeInTheDocument();
  });

  it('renders the a2uiSurface test subject wrapper', () => {
    const surface = createSurface();
    render(<A2UIRenderer surface={surface} />);

    expect(screen.getByTestId('a2uiSurface')).toBeInTheDocument();
  });
});

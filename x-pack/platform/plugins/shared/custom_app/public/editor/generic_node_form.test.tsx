/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { findNode, type AppDocument, type AppNode, type AppNodeType } from '@kbn/custom-app-common';
import { PropertiesPanel } from './properties_panel';
import { NODE_CATALOG, getCatalogEntry } from './node_catalog';
import { createDefaultNode } from './node_defaults';

// A type of component that the schema and the renderer know, and the editor does not.
const NEW_TYPE = 'gauge_meter' as AppNodeType;

const withNewComponent = () =>
  ({
    state: {},
    root: {
      type: 'stack',
      id: 'root',
      direction: 'vertical',
      children: [{ type: NEW_TYPE, id: 'cpu', title: 'CPU', max: 100, unit: '%' }],
    },
  } as unknown as AppDocument);

const setup = () => {
  const latest: { document: AppDocument } = { document: withNewComponent() };
  const Host = () => {
    const [document, setDocument] = useState(withNewComponent());
    latest.document = document;
    return (
      <PropertiesPanel
        node={findNode(document.root, 'cpu')!.node as AppNode}
        document={document}
        issues={[]}
        onChange={jest.fn()}
        onEdit={(change) => setDocument((current) => change(current))}
      />
    );
  };
  render(<Host />);
  const component = () =>
    findNode(latest.document.root, 'cpu')!.node as unknown as Record<string, unknown>;
  return { component };
};

const settings = () => screen.getByRole('textbox', { name: 'Settings as JSON' });

describe('a component the editor has no form for', () => {
  it('is named from its type, and not offered to add', () => {
    expect(getCatalogEntry(NEW_TYPE).label).toBe('Gauge meter');
    expect(NODE_CATALOG.some(({ type }) => type === NEW_TYPE)).toBe(false);
    expect(createDefaultNode(NEW_TYPE, 'x', { valueKey: '' })).toBeUndefined();
  });

  it('is still offered for the components that have one', () => {
    expect(NODE_CATALOG.map(({ type }) => type)).toEqual(
      expect.arrayContaining(['heading', 'chart', 'table', 'stack'])
    );
  });

  it('shows what it is made of as JSON, without what the editor keeps itself', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Gauge meter' })).toBeInTheDocument();
    expect(JSON.parse((settings() as HTMLTextAreaElement).value)).toEqual({
      title: 'CPU',
      max: 100,
      unit: '%',
    });
  });

  it('is changed by what is written, and what is taken out is taken out', () => {
    const { component } = setup();

    fireEvent.change(settings(), { target: { value: '{"title":"Memory","max":64}' } });

    expect(component()).toEqual({ type: NEW_TYPE, id: 'cpu', title: 'Memory', max: 64 });
  });

  it('says when it is not JSON yet, and changes nothing until it is', () => {
    const { component } = setup();

    fireEvent.change(settings(), { target: { value: '{"title":' } });
    expect(screen.getByText('This is not valid JSON yet.')).toBeInTheDocument();
    expect(component().title).toBe('CPU');

    fireEvent.change(settings(), { target: { value: '[1, 2]' } });
    expect(screen.getByText('This needs to be an object, in curly braces.')).toBeInTheDocument();
    expect(component().title).toBe('CPU');

    fireEvent.change(settings(), { target: { value: '{"title":"Disk"}' } });
    expect(screen.queryByText(/not valid JSON/)).not.toBeInTheDocument();
    expect(component().title).toBe('Disk');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FLOW_DIMMED_OPACITY } from './canvas_constants';
import { PendingConnectionProvider, type PendingConnection } from './canvas_connection_highlight';
import { withFlowHighlight } from './canvas_flow_highlight';

const connection: PendingConnection = { originId: 's1', targetIds: new Set(['d1']) };

describe('withFlowHighlight while a line is dragged', () => {
  const Node = withFlowHighlight(({ id }: { id: string }) => <span>{id}</span>);

  const renderNodes = (value: PendingConnection | null) =>
    render(
      <PendingConnectionProvider value={value}>
        <Node id="s1" />
        <Node id="d1" />
        <Node id="d2" />
      </PendingConnectionProvider>
    );

  const wrapperOf = (id: string) => screen.getByText(id).parentElement;

  it('keeps the origin and the nodes that can take the line, and fades the rest', () => {
    renderNodes(connection);

    expect(wrapperOf('s1')).toHaveStyle({ opacity: 1 });
    expect(wrapperOf('d1')).toHaveStyle({ opacity: 1 });
    expect(wrapperOf('d2')).toHaveStyle({ opacity: FLOW_DIMMED_OPACITY });
  });

  it('fades nothing while no line is dragged', () => {
    renderNodes(null);

    expect(wrapperOf('s1')).toHaveStyle({ opacity: 1 });
    expect(wrapperOf('d1')).toHaveStyle({ opacity: 1 });
    expect(wrapperOf('d2')).toHaveStyle({ opacity: 1 });
  });
});

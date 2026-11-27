/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Position, type EdgeProps } from '@xyflow/react';
import { PendingConnectionProvider, type PendingConnection } from '../canvas_connection_highlight';
import type { ClassicCanvasEdge } from '../types';
import { AnimatedEdge } from './animated_edge';

// The label renderer portals into React Flow's pane, which these tests do not render.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  EdgeLabelRenderer: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../state_management', () => ({
  useCanvasEvents: () => ({
    openRoutingFlyout: jest.fn(),
    openProcessingFlyout: jest.fn(),
    openLineProcessingFlyout: jest.fn(),
  }),
}));

const edgeProps = {
  id: 'unit-connection-a->b',
  source: 'a',
  target: 'b',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 0,
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  selected: true,
} as EdgeProps<ClassicCanvasEdge>;

const renderSelectedEdge = (connection: PendingConnection | null) =>
  render(
    <PendingConnectionProvider value={connection}>
      <svg>
        <AnimatedEdge {...edgeProps} />
      </svg>
    </PendingConnectionProvider>
  );

const menuButton = () => screen.queryByTestId('streamsCanvasEdgeMenuButton');

describe('AnimatedEdge', () => {
  it('shows the add menu button on a selected line', () => {
    renderSelectedEdge(null);

    expect(menuButton()).toBeInTheDocument();
  });

  it('hides the add menu button while a line is dragged', () => {
    renderSelectedEdge({ originId: 'c', targetIds: new Set() });

    expect(menuButton()).toBeNull();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Position, ReactFlowProvider } from '@xyflow/react';
import { PendingConnectionProvider, type PendingConnection } from '../canvas_connection_highlight';
import { ConnectionHandle } from './connection_handle';

// The handle reads its node id from React Flow's node wrapper, which these tests do not render.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  useNodeId: () => 'configured-destination-es-logs',
}));

const renderTargetHandle = (connection: PendingConnection) =>
  render(
    <ReactFlowProvider>
      <PendingConnectionProvider value={connection}>
        <ConnectionHandle type="target" position={Position.Left} isConnectable />
      </PendingConnectionProvider>
    </ReactFlowProvider>
  ).container.querySelector('.react-flow__handle');

describe('ConnectionHandle', () => {
  it('rings a target handle whose node can take the dragged line', () => {
    const handle = renderTargetHandle({
      originId: 'configured-source-logs-in',
      targetIds: new Set(['configured-destination-es-logs']),
    });

    expect(handle).toHaveClass('streamsConnectionTarget');
  });

  it('does not ring a target handle whose node cannot take the dragged line', () => {
    const handle = renderTargetHandle({
      originId: 'configured-source-logs-in',
      targetIds: new Set(['configured-destination-es-archive']),
    });

    expect(handle).not.toHaveClass('streamsConnectionTarget');
  });
});

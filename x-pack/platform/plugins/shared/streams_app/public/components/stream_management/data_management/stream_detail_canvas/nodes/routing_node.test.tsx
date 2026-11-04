/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import type { RoutingNode as RoutingNodeType } from '../types';
import { RoutingNode } from './routing_node';

describe('RoutingNode', () => {
  it('labels a docs route as Documents', async () => {
    render(
      <ReactFlowProvider>
        <RoutingNode
          {...({
            data: {
              pipelineId: 'orders-pipeline',
              rules: [
                {
                  handleId: 'route-0',
                  label: 'body["order.status"] == "shipped"',
                  isCatchAll: false,
                  connected: true,
                  signals: ['docs'],
                },
              ],
            },
            selected: false,
            dragging: false,
          } as NodeProps<RoutingNodeType>)}
        />
      </ReactFlowProvider>
    );

    await userEvent.hover(screen.getByText('route-0'));

    expect(await screen.findByTestId('streamsCanvasSourceSignalBadge')).toHaveTextContent(
      'Documents'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import type { SourceNode as SourceNodeType } from '../types';
import { SourceNode } from './source_node';

describe('SourceNode', () => {
  it('labels a docs source as Documents', () => {
    render(
      <ReactFlowProvider>
        <SourceNode
          {...({
            data: { title: 'Orders', subtitle: 'Managed _bulk', signals: ['docs'] },
            selected: false,
            dragging: false,
          } as NodeProps<SourceNodeType>)}
        />
      </ReactFlowProvider>
    );

    expect(screen.getByTestId('streamsCanvasSourceSignalBadge')).toHaveTextContent('Documents');
  });
});

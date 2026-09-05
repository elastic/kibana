/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { HIGHLIGHT_TRANSITION_MS, NODE_DIM_OPACITY } from '../canvas_constants';
import { useHighlightRole } from '../canvas_highlight_context';

/** Dims a node (card and handles) when it sits outside the spotlighted flow. */
export function CanvasNodeHighlight({
  nodeId,
  children,
}: {
  nodeId: string;
  children: React.ReactNode;
}) {
  const role = useHighlightRole(nodeId, 'node');

  return (
    <div
      css={css`
        opacity: ${role === 'out' ? NODE_DIM_OPACITY : 1};
        transition: opacity ${HIGHLIGHT_TRANSITION_MS}ms ease;
      `}
    >
      {children}
    </div>
  );
}

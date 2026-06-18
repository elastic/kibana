/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The inline routing node (a branch glyph) and the draggable "puck" at the end
// of a freshly-created, not-yet-wired routing branch.

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { RoutingFlowNode } from '../types';
import {
  hiddenHandleClassName,
  inflateClassName,
  useAnchorHandleClassName,
  useRaiseOnHoverClassName,
} from '../node-styles';

// A routing node placed inline on a connector (created by applying a routing
// condition from the connector's "Add step" menu). It mirrors the small inline
// pipeline node — a white, subtly bordered panel with a shadow — but carries a
// primary "branch" glyph rotated 90° as the routing cue.
function RoutingNodeContents() {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  return (
    <div
      className={css`
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `}
    >
      <EuiPanel
        hasShadow
        paddingSize="m"
        className={`${css`
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.small};

          .euiIcon {
            transform: rotate(90deg);
          }
        `} ${raiseOnHoverClassName}`}
      >
        <EuiIcon type="branch" size="m" color="primary" />
      </EuiPanel>
    </div>
  );
}

export const RoutingNode = memo((_props: NodeProps<RoutingFlowNode>) => {
  const anchorHandleClassName = useAnchorHandleClassName();
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Left} className={anchorHandleClassName} />
      <RoutingNodeContents />
      <Handle type="source" position={Position.Right} className={anchorHandleClassName} />
    </div>
  );
});
RoutingNode.displayName = 'RoutingNode';

// The dangling end of a freshly created routing connector. The connector's own
// target anchor circle (drawn by the edge) sits at this node's handle and is the
// grab point; this node just carries a hint label and is itself draggable, so the
// user can reposition the loose end and drop it onto a destination.
function RoutingEndpointContents() {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding-right: ${euiTheme.size.s};
        cursor: grab;
        &:active {
          cursor: grabbing;
        }
      `}
    >
      <EuiText
        size="xs"
        color="subdued"
        className={css`
          white-space: nowrap;
        `}
      >
        {i18n.translate('xpack.streams.streamsCanvas.dragToConnect', {
          defaultMessage: 'Drag to a destination',
        })}
      </EuiText>
    </div>
  );
}

export const RoutingEndpointNode = memo(() => {
  return (
    <div className={inflateClassName}>
      <Handle type="target" position={Position.Right} className={hiddenHandleClassName} />
      <RoutingEndpointContents />
    </div>
  );
});
RoutingEndpointNode.displayName = 'RoutingEndpointNode';

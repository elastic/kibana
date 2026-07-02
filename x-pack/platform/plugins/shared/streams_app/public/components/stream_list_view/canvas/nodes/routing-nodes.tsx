/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The inline routing node (a branch glyph) and the draggable "puck" at the end
// of a freshly-created, not-yet-wired routing branch.

import React, { memo, useEffect } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useUpdateNodeInternals,
  type NodeProps,
} from '@xyflow/react';
import { EuiHorizontalRule, EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { RoutingBranch, RoutingFlowNode, RoutingNodeData } from '../types';
import {
  hiddenHandleClassName,
  inflateClassName,
  useAnchorHandleClassName,
  useRaiseOnHoverClassName,
} from '../node-styles';

// A routing node shows one labelled row per line exiting it. Labels and traffic
// percentages come from the node data when seeded; otherwise a "routing-N"
// label is generated for each exit line.
function resolveRoutingBranches(data: RoutingNodeData, exitCount: number): RoutingBranch[] {
  const seeded = data.branches;
  const count = exitCount || seeded?.length || 1;
  return Array.from({ length: count }, (_, index) => ({
    label:
      seeded?.[index]?.label ??
      i18n.translate('xpack.streams.streamsCanvas.routingBranchLabel', {
        defaultMessage: 'routing-{index}',
        values: { index: index + 1 },
      }),
    percentage: seeded?.[index]?.percentage,
  }));
}

// A routing node placed inline on a connector (created by applying a routing
// condition from the connector's "Add step" menu). A "branch" glyph cell sits on
// the left, and each line exiting the node is listed as a labelled row (with an
// optional traffic-share percentage) on the right, separated by dividers. Each
// row carries its own source handle (`branch-N`) so its connector anchors to
// that row.
function RoutingNodeContents({
  branches,
  anchorHandleClassName,
}: {
  branches: RoutingBranch[];
  anchorHandleClassName: string;
}) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  return (
    <EuiPanel
      hasShadow
      paddingSize="none"
      className={`${css`
        display: flex;
        align-items: stretch;
        cursor: pointer;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.small};
      `} ${raiseOnHoverClassName}`}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          border-right: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};

          .euiIcon {
            transform: rotate(90deg);
          }
        `}
      >
        <EuiIcon type="branch" size="m" color="primary" />
      </div>
      <div
        className={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.xxs};
          min-width: 80px;
          padding: ${euiTheme.size.xs} 0;
        `}
      >
        {branches.map((branch, index) => (
          <React.Fragment key={index}>
            {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
            <div
              className={css`
                position: relative;
                display: flex;
                align-items: center;
                gap: ${euiTheme.size.xs};
                padding: 0 6px;
              `}
            >
              <EuiText
                className={css`
                  flex: 1 1 auto;
                  min-width: 0;
                  font-size: 10.5px;
                  line-height: ${euiTheme.size.base};
                  font-weight: ${euiTheme.font.weight.semiBold};
                  color: ${euiTheme.colors.textParagraph};
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                {branch.label}
              </EuiText>
              {branch.percentage ? (
                <EuiText
                  className={css`
                    flex-shrink: 0;
                    width: 24px;
                    font-size: 9px;
                    line-height: ${euiTheme.size.m};
                    color: ${euiTheme.colors.textSubdued};
                    text-align: right;
                  `}
                >
                  {branch.percentage}
                </EuiText>
              ) : null}
              <Handle
                type="source"
                id={`branch-${index}`}
                position={Position.Right}
                className={anchorHandleClassName}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </EuiPanel>
  );
}

export const RoutingNode = memo(({ id, data }: NodeProps<RoutingFlowNode>) => {
  const anchorHandleClassName = useAnchorHandleClassName();
  const updateNodeInternals = useUpdateNodeInternals();
  // One row (with its own source handle) per line exiting the node.
  const outgoing = useNodeConnections({ handleType: 'source' });
  const branches = resolveRoutingBranches(data, outgoing.length);
  // The per-row source handles are rendered dynamically, so React Flow must be
  // told to re-measure them whenever their count changes; otherwise the
  // `branch-N` handles aren't registered and connectors fall back to the node
  // origin instead of anchoring to their row.
  //
  // Crucially, the node plays a scale() entry animation (see inflateClassName).
  // Measuring the handle bounds while that transform is mid-flight registers
  // them at scaled-down offsets and leaves the connectors detached from their
  // rows for good. So we re-measure immediately and again once the animation
  // has settled (the onAnimationEnd handler below is the authoritative pass;
  // the timeout is a fallback for when the animation is interrupted or the node
  // mounts already-visible and never fires an animationend event).
  useEffect(() => {
    updateNodeInternals(id);
    const timeout = setTimeout(() => updateNodeInternals(id), 220);
    return () => clearTimeout(timeout);
  }, [id, branches.length, updateNodeInternals]);
  return (
    <div className={inflateClassName} onAnimationEnd={() => updateNodeInternals(id)}>
      <Handle type="target" position={Position.Left} className={anchorHandleClassName} />
      <RoutingNodeContents branches={branches} anchorHandleClassName={anchorHandleClassName} />
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

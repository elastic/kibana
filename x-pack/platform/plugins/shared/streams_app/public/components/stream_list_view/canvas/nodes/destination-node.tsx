/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The destination node and its two states: unconfigured / configured. A
// configured destination renders as a SINGLE card (not a card-within-a-card)
// and is fully draggable; clicking is handled at the canvas level (onNodeClick),
// which opens the configuration flyout for an unconfigured node and the
// destination detail flyout for a configured one.

import React, { memo, useContext, useEffect } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useUpdateNodeInternals,
  type NodeProps,
} from '@xyflow/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { DestinationFlowNode, DestinationNodeData } from '../types';
import {
  hiddenHandleClassName,
  inflateClassName,
  useAnchorHandleClassName,
  useRaiseOnHoverClassName,
  useRestingShadowClassName,
} from '../node-styles';
import { AttachedRoutingFlyoutContext } from '../contexts';

// A freshly-placed destination starts as this attention card — a single
// danger-bordered card (matching the unconfigured source card treatment)
// prompting the user to finish setting it up. Clicking is handled at the canvas
// level (onNodeClick), same as the configured card, so the whole node stays
// draggable and a click opens the configuration flyout.
export function UnconfiguredDestinationContents({
  data,
  interactive = true,
}: {
  data: DestinationNodeData;
  interactive?: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="none"
      className={`${css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
        width: 184px;
        padding: ${euiTheme.size.m};
        text-align: left;
        cursor: pointer;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.danger};
        border-radius: ${euiTheme.border.radius.medium};
      `} ${interactive ? raiseOnHoverClassName : ''}`}
    >
      <EuiText
        size="xs"
        className={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          color: ${euiTheme.colors.textHeading};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {data.title}
      </EuiText>
      <EuiText
        size="xs"
        className={css`
          color: ${euiTheme.colors.textDanger};
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {i18n.translate('xpack.streams.streamsCanvas.clickToConfigure', {
          defaultMessage: 'Click to configure',
        })}
      </EuiText>
    </EuiPanel>
  );
}

// The title + throughput/latency + status body shared by the plain configured
// card and the attached-routing variant.
function ConfiguredDestinationBody({
  data,
  isConnected,
}: {
  data: DestinationNodeData;
  isConnected: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  // Footer metadata (throughput/latency): monospace to match the pipeline
  // node's stat text, since these are numeric/tabular values.
  const metaTextClassName = css`
    font-family: ${euiTheme.font.familyCode};
    font-size: 10px;
    line-height: ${euiTheme.size.base};
    color: ${euiTheme.colors.textSubdued};
  `;
  // Boxed glyph (e.g. `processor`) leading the footer — subdued chip matching the
  // Figma "processor" cell: subdued fill, thin subdued border, panel radius.
  const footerIconClassName = css`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${euiTheme.size.xxs};
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
  `;
  return (
    <>
      <EuiText
        size="xs"
        className={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          line-height: ${euiTheme.size.base};
          color: ${euiTheme.colors.textParagraph};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {data.title}
      </EuiText>
      {isConnected ? (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {data.footerIcon ? (
                <EuiFlexItem grow={false}>
                  <div className={footerIconClassName}>
                    <EuiIcon type={data.footerIcon} size="s" />
                  </div>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>
                <EuiText className={metaTextClassName}>{data.meta}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">{data.status}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiText className={metaTextClassName}>
          {i18n.translate('xpack.streams.streamsCanvas.dataNotFlowingIn', {
            defaultMessage: 'Data not flowing in',
          })}
        </EuiText>
      )}
    </>
  );
}

// A configured destination renders as a SINGLE card (matching the source and
// pipeline nodes) rather than a card-within-a-card. Clicking is handled at the
// canvas level via onNodeClick, so the whole card stays draggable.
//
// When `data.attachedRouting` is set (the opinionated routing-with-inheritance
// result) the card grows a left routing "tab" — a subdued cell holding the
// branch glyph, flush against the destination body — so the routing node reads
// as attached to the destination it was created from.
function ConfiguredDestinationContents({
  data,
  isConnected,
}: {
  data: DestinationNodeData;
  isConnected: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const raiseOnHoverClassName = useRaiseOnHoverClassName();
  const restingShadowClassName = useRestingShadowClassName();
  const openAttachedRoutingFlyout = useContext(AttachedRoutingFlyoutContext);

  if (data.attachedRouting) {
    return (
      <EuiPanel
        hasShadow={false}
        paddingSize="none"
        className={`${restingShadowClassName} ${css`
          display: flex;
          align-items: stretch;
          overflow: hidden;
          text-align: left;
          cursor: pointer;
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.medium};
        `} ${raiseOnHoverClassName}`}
      >
        {/*
          The routing tab (branch glyph) opens the opinionated routing flyout on
          its applied summary — the last screen of the create-with-inheritance
          flow — rather than the destination flyout. Stop propagation so the
          canvas-level onNodeClick (which opens the destination flyout for the
          body) doesn't also fire. The card stays draggable: drag runs off
          mousedown, this only intercepts the click.
        */}
        <div
          role="button"
          tabIndex={0}
          aria-label={i18n.translate('xpack.streams.streamsCanvas.openAttachedRouting', {
            defaultMessage: 'Open routing conditions',
          })}
          onClick={(event) => {
            event.stopPropagation();
            openAttachedRoutingFlyout();
          }}
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 ${euiTheme.size.base};
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            border-right: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
            cursor: pointer;

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
            gap: ${euiTheme.size.s};
            padding: ${euiTheme.size.m};
            min-width: 191px;
          `}
        >
          <ConfiguredDestinationBody data={data} isConnected={isConnected} />
        </div>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize="none"
      className={`${restingShadowClassName} ${css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.m};
        min-width: 211px;
        text-align: left;
        cursor: pointer;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
        border-radius: ${euiTheme.border.radius.medium};
      `} ${raiseOnHoverClassName}`}
    >
      <ConfiguredDestinationBody data={data} isConnected={isConnected} />
    </EuiPanel>
  );
}

export const DestinationNode = memo(({ id, data }: NodeProps<DestinationFlowNode>) => {
  const anchorHandleClassName = useAnchorHandleClassName();
  const updateNodeInternals = useUpdateNodeInternals();

  // The attached-routing source handle (bottom-left tab anchor) is rendered
  // conditionally, and the card plays a scale() entry animation (inflateClassName).
  // Measuring the handle bounds while that transform is mid-flight registers it at
  // a scaled-down offset, leaving the attached-routing branch connector detached
  // from the tab. Re-measure immediately and again once the animation settles
  // (onAnimationEnd is authoritative; the timeout covers interrupted animations
  // or a node that mounts already-visible and never fires animationend).
  useEffect(() => {
    updateNodeInternals(id);
    const timeout = setTimeout(() => updateNodeInternals(id), 220);
    return () => clearTimeout(timeout);
  }, [id, data.mode, data.attachedRouting, updateNodeInternals]);

  // A destination is "connected to a source" once an incoming (target) edge exists.
  const incomingConnections = useNodeConnections({ handleType: 'target' });
  const isConnectedToSource = incomingConnections.length > 0;

  return (
    <div className={inflateClassName} onAnimationEnd={() => updateNodeInternals(id)}>
      <Handle type="target" position={Position.Left} className={anchorHandleClassName} />
      {data.mode === 'configured' ? (
        <ConfiguredDestinationContents data={data} isConnected={isConnectedToSource} />
      ) : (
        <UnconfiguredDestinationContents data={data} />
      )}
      {/*
        Legacy default source handle kept for layout compatibility. The routing
        handle above is the real output anchor, so this one is non-interactive to
        avoid two overlapping connectable points on the right edge.
      */}
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={hiddenHandleClassName}
      />
      {/*
        Attached-routing branch: when this destination carries an attached
        routing tab, its second branch fans out from the bottom of that tab to a
        newly-created destination below.
      */}
      {data.mode === 'configured' && data.attachedRouting ? (
        <Handle
          type="source"
          id="attached-routing"
          position={Position.Bottom}
          className={anchorHandleClassName}
          style={{ left: '24px' }}
        />
      ) : null}
    </div>
  );
});
DestinationNode.displayName = 'DestinationNode';

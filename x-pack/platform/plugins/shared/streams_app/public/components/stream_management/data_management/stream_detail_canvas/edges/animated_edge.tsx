/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css, keyframes } from '@emotion/react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useBoolean, useDebounceFn } from '@kbn/react-hooks';
import { useCanvasEvents } from '../state_management';

const DASH = 4;
const GAP = 8;
const DASH_PERIOD = DASH + GAP;
const DEBOUNCE_OPTS = { wait: 250 };
const PATH_OPACITY = { opacity: 0.85 };

const noop = () => {};

const flowMarch = keyframes`
  from {
    stroke-dashoffset: ${DASH_PERIOD};
  }
  to {
    stroke-dashoffset: 0;
  }
`;

const flowStyles = css`
  fill: none;
  stroke-dasharray: ${DASH} ${GAP};
  animation: ${flowMarch} 0.9s linear infinite;
  pointer-events: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
  data,
}: EdgeProps) {
  const { openRoutingFlyout } = useCanvasEvents();
  const edgeMenuId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const [isHovered, hover] = useBoolean();
  const [showMenu, menu] = useBoolean();
  const canUnhook = Boolean(
    data && typeof data === 'object' && 'unitConnection' in data && data.unitConnection
  );

  // The built-in unhook circles sit on the line just outside each handle and are
  // easy to miss. Pressing the line itself starts that same drag from the
  // destination end, so pulling the line onto empty canvas disconnects it.
  const onLinePointerDown = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (!canUnhook || event.button !== 0) {
        return;
      }
      const updater = event.currentTarget.parentElement?.querySelector<SVGElement>(
        '.react-flow__edgeupdater-target'
      );
      if (!updater) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      updater.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: event.clientX,
          clientY: event.clientY,
          screenX: event.screenX,
          screenY: event.screenY,
          button: 0,
          buttons: 1,
        })
      );
    },
    [canUnhook]
  );

  const closeAll = useCallback(() => {
    hover.off();
    menu.off();
  }, [hover, menu]);

  const { run: close, cancel: cancelClose } = useDebounceFn(closeAll, DEBOUNCE_OPTS);

  const show = useCallback(() => {
    hover.on();
    cancelClose();
  }, [hover, cancelClose]);

  const menuClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      e.preventDefault();
      e.stopPropagation();
      menu.toggle();
    },
    [menu]
  );

  const [edgePath, centerX, centerY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const labelPositionStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`,
      pointerEvents: 'all' as const,
      zIndex: 5,
    }),
    [centerX, centerY]
  );

  const openEdgeRoutingFlyout = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openRoutingFlyout(id, 'routing');
      menu.off();
      hover.off();
    },
    [id, openRoutingFlyout, menu, hover]
  );

  const openEdgeProcessingFlyout = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openRoutingFlyout(id, 'processing');
      menu.off();
      hover.off();
    },
    [id, openRoutingFlyout, menu, hover]
  );

  const closeOnEscape = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeAll();
      }
    },
    [closeAll]
  );

  const isActive = isHovered || Boolean(selected);
  const strokeColor = isActive ? 'transparent' : euiTheme.colors.borderBaseProminent;

  const edgeStyle = useMemo(
    () => ({
      ...style,
      stroke: strokeColor,
      strokeWidth: 1,
    }),
    [style, strokeColor]
  );

  const MenuButton = (
    <EuiIcon
      data-test-subj="streamsCanvasEdgeMenuButton"
      id={edgeMenuId}
      aria-label={i18n.translate('xpack.streams.animatedEdge.editPipelineRouteMenuLabel', {
        defaultMessage: 'Edit pipeline route menu',
      })}
      type="plusCircle"
      color="primary"
      size="l"
      css={css`
        border-radius: 99px;
        background-color: ${euiTheme.colors.backgroundBasePlain};
        &:hover {
          cursor: pointer;
        }
      `}
      onClick={menuClick}
    />
  );

  return (
    <g onMouseDown={onLinePointerDown} onMouseEnter={show} onMouseLeave={close}>
      <BaseEdge
        id={id}
        data-test-subj="streamsCanvasBasicEdge"
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
        interactionWidth={24}
      />
      {isActive ? (
        <path
          d={edgePath}
          css={flowStyles}
          stroke={euiTheme.colors.primary}
          strokeWidth={1}
          strokeLinecap="round"
          style={PATH_OPACITY}
        />
      ) : null}
      {canUnhook && isActive ? (
        <EdgeLabelRenderer>
          <div className="nopan nodrag" style={labelPositionStyle}>
            <EuiPopover
              data-test-subj="streamsCanvasEdgeMenu"
              aria-labelledby={edgeMenuId}
              button={MenuButton}
              isOpen={showMenu}
              closePopover={noop}
              panelPaddingSize="none"
              anchorPosition="upCenter"
              attachToAnchor
              onKeyDown={closeOnEscape}
            >
              <EuiContextMenuPanel onClose={menu.off}>
                <EuiContextMenuItem
                  data-test-subj="streamsCanvasEdgeMenu-addProcessing"
                  onClick={openEdgeProcessingFlyout}
                >
                  {i18n.translate('xpack.streams.animatedEdge.addProcessingContextMenuItemLabel', {
                    defaultMessage: 'Add processing',
                  })}
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  data-test-subj="streamsCanvasEdgeMenu-addRouting"
                  onClick={openEdgeRoutingFlyout}
                >
                  {i18n.translate('xpack.streams.animatedEdge.addRoutingContextMenuItemLabel', {
                    defaultMessage: 'Add routing',
                  })}
                </EuiContextMenuItem>
              </EuiContextMenuPanel>
            </EuiPopover>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}

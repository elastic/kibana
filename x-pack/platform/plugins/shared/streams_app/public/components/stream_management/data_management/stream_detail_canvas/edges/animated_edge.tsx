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
import { BaseEdge, EdgeToolbar, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { useBoolean, useDebounceFn } from '@kbn/react-hooks';

const DASH = 4;
const GAP = 8;
const DASH_PERIOD = DASH + GAP;
const DEBOUNCE_OPTS = { wait: 250 };
const PATH_OPACITY = { opacity: 0.85 };

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

  const [edgePath, centerX, centerY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const isActive = isHovered || Boolean(selected);
  const strokeColor = isActive ? 'transparent' : euiTheme.colors.borderBaseProminent;

  const edgeStyle = useMemo(
    () => ({ ...style, stroke: strokeColor, strokeWidth: 1 }),
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
      size="xxl"
      css={css`
        border-radius: 99px;
        background-color: ${euiTheme.colors.backgroundBasePlain};
        &:hover {
          cursor: pointer;
        }
      `}
      onClick={menu.toggle}
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
      <EdgeToolbar edgeId={id} x={centerX} y={centerY} isVisible={isActive}>
        <EuiPopover
          data-test-subj="streamsCanvasEdgeMenu"
          aria-labelledby={edgeMenuId}
          button={MenuButton}
          isOpen={showMenu}
          closePopover={menu.off}
          panelPaddingSize="none"
          anchorPosition="upCenter"
        >
          <EuiContextMenuPanel>
            <EuiContextMenuItem
              data-test-subj="streamsCanvasEdgeMenu-addProcessing"
              onClick={() => {}}
            >
              {i18n.translate('xpack.streams.animatedEdge.addProcessingContextMenuItemLabel', {
                defaultMessage: 'Add processing',
              })}
            </EuiContextMenuItem>
            <EuiContextMenuItem
              data-test-subj="streamsCanvasEdgeMenu-addRouting"
              onClick={() => {}}
            >
              {i18n.translate('xpack.streams.animatedEdge.addRoutingContextMenuItemLabel', {
                defaultMessage: 'Add routing',
              })}
            </EuiContextMenuItem>
          </EuiContextMenuPanel>
        </EuiPopover>
      </EdgeToolbar>
    </g>
  );
}

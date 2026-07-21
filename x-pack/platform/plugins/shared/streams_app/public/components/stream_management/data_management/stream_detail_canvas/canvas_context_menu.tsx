/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiPanel, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface CanvasContextMenuProps {
  position: ContextMenuPosition | null;
  onClose: () => void;
}

const CONTEXT_MENU_VIEWPORT_MARGIN = 8;

/**
 * Right-click context menu for canvas nodes. It is fixed-positioned at the
 * cursor (viewport coordinates) and clamped back inside the viewport after
 * render. A full-screen backdrop sits behind it so any outside click or
 * right-click reliably closes the menu — this is more robust than anchoring an
 * `EuiPopover`, whose outside-click detection competes with React Flow's own
 * pointer handling.
 */
export function CanvasContextMenu({ position, onClose }: CanvasContextMenuProps) {
  const { euiTheme } = useEuiTheme();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!position) {
      return;
    }
    const element = menuRef.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - CONTEXT_MENU_VIEWPORT_MARGIN;
    const maxY = window.innerHeight - rect.height - CONTEXT_MENU_VIEWPORT_MARGIN;
    const clampedX = Math.max(CONTEXT_MENU_VIEWPORT_MARGIN, Math.min(position.x, maxX));
    const clampedY = Math.max(CONTEXT_MENU_VIEWPORT_MARGIN, Math.min(position.y, maxY));
    element.style.left = `${clampedX}px`;
    element.style.top = `${clampedY}px`;
  }, [position]);

  if (!position) {
    return null;
  }

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
        css={css`
          position: fixed;
          inset: 0;
          z-index: ${euiTheme.levels.menu};
        `}
      />
      <div
        ref={menuRef}
        css={css`
          position: fixed;
          top: ${position.y}px;
          left: ${position.x}px;
          z-index: ${Number(euiTheme.levels.menu) + 1};
        `}
      >
        <EuiPanel paddingSize="none" hasShadow data-test-subj="streamsCanvasNodeContextMenu">
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="action"
                data-test-subj="streamsCanvasNodeContextMenuAction"
                onClick={onClose}
              >
                {i18n.translate('xpack.streams.canvas.nodeContextMenu.actionLabel', {
                  defaultMessage: 'Action',
                })}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPanel>
      </div>
    </>
  );
}

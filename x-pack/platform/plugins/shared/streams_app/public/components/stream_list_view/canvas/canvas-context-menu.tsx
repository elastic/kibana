/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The right-click context menu (Select stream / Cleanup / Group). Fixed-
// positioned at the cursor and clamped into the viewport after render (so a
// right-click near a screen edge doesn't push it off-screen). A full-screen
// backdrop closes it on any outside click.

import React, { useLayoutEffect, useRef } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { CanvasContextMenu } from './use-canvas-selection';

interface CanvasContextMenuProps {
  menu: CanvasContextMenu | null;
  onClose: () => void;
  onSelectStream: (nodeIds: string[]) => void;
  onCleanup: (nodeIds: string[]) => void;
}

export function CanvasContextMenu({
  menu,
  onClose,
  onSelectStream,
  onCleanup,
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // After it renders, measure and nudge it back inside the viewport if the
  // cursor was near the right/bottom edge.
  useLayoutEffect(() => {
    if (!menu) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const maxX = window.innerWidth - rect.width - margin;
    const maxY = window.innerHeight - rect.height - margin;
    const clampedX = Math.max(margin, Math.min(menu.x, maxX));
    const clampedY = Math.max(margin, Math.min(menu.y, maxY));
    if (clampedX !== menu.x || clampedY !== menu.y) {
      el.style.left = `${clampedX}px`;
      el.style.top = `${clampedY}px`;
    }
  }, [menu]);

  if (!menu) return null;

  const items = [
    <EuiContextMenuItem
      key="select-stream"
      icon="graphApp"
      onClick={() => {
        onSelectStream(menu.nodeIds);
        onClose();
      }}
    >
      {i18n.translate('xpack.streams.streamsCanvas.selectStream', {
        defaultMessage: 'Select stream',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="cleanup"
      icon="sparkles"
      onClick={() => {
        onCleanup(menu.nodeIds);
        onClose();
      }}
    >
      {i18n.translate('xpack.streams.streamsCanvas.cleanupSelection', {
        defaultMessage: 'Cleanup',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <>
      {/* Click/right-click outside the menu closes it. */}
      <div
        role="presentation"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
        className={css`
          position: fixed;
          inset: 0;
          z-index: 1000;
        `}
      />
      <div
        ref={ref}
        className={css`
          position: fixed;
          top: ${menu.y}px;
          left: ${menu.x}px;
          z-index: 1001;
        `}
      >
        <EuiPanel paddingSize="none" hasShadow>
          <EuiContextMenuPanel items={items} />
        </EuiPanel>
      </div>
    </>
  );
}

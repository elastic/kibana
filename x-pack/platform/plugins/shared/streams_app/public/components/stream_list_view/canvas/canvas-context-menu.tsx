/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The right-click context menu. Fixed-positioned at the cursor and clamped into
// the viewport after render (so a right-click near a screen edge doesn't push it
// off-screen). A full-screen backdrop closes it on any outside click.
//
// The menu is type-aware: a right-click on a single destination node shows a
// destination-specific menu (Add routing with inheritance / Select stream /
// View in Discover / Delete), while everything else shows the generic menu
// (Select stream / Delete).

import React, { useLayoutEffect, useRef } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import type { CanvasContextMenu } from './use-canvas-selection';

interface CanvasContextMenuProps {
  menu: CanvasContextMenu | null;
  onClose: () => void;
  onSelectStream: (nodeIds: string[]) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  /** Destination-only action: open the "opinionated routing" flyout. */
  onAddRoutingWithInheritance: (nodeIds: string[]) => void;
}

export function CanvasContextMenu({
  menu,
  onClose,
  onSelectStream,
  onDeleteNodes,
  onAddRoutingWithInheritance,
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

  // A right-click on exactly one destination node gets the destination-specific
  // menu; multi-selections and other node types fall back to the generic menu.
  const isSingleDestination = menu.nodeIds.length === 1 && menu.nodeTypes[0] === 'destination';

  const selectStreamItem = (
    <EuiContextMenuItem
      key="select-stream"
      onClick={() => {
        onSelectStream(menu.nodeIds);
        onClose();
      }}
    >
      {i18n.translate('xpack.streams.streamsCanvas.selectStream', {
        defaultMessage: 'Select stream',
      })}
    </EuiContextMenuItem>
  );

  const deleteItem = (
    <EuiContextMenuItem
      key="delete"
      onClick={() => {
        onDeleteNodes(menu.nodeIds);
        onClose();
      }}
    >
      <EuiTextColor color="danger">
        {i18n.translate('xpack.streams.streamsCanvas.deleteNode', {
          defaultMessage: 'Delete',
        })}
      </EuiTextColor>
    </EuiContextMenuItem>
  );

  const items = isSingleDestination
    ? [
        <EuiContextMenuItem
          key="add-routing-with-inheritance"
          onClick={() => {
            onAddRoutingWithInheritance(menu.nodeIds);
            onClose();
          }}
        >
          <span>
            {i18n.translate('xpack.streams.streamsCanvas.addRoutingWithInheritance', {
              defaultMessage: 'Add routing with inheritance',
            })}
          </span>
          <EuiText size="xs">
            <EuiTextColor color="subdued">
              {i18n.translate('xpack.streams.streamsCanvas.addRoutingWithInheritanceHint', {
                defaultMessage: 'Keep this configuration downstream',
              })}
            </EuiTextColor>
          </EuiText>
        </EuiContextMenuItem>,
        selectStreamItem,
        <EuiContextMenuItem
          key="view-in-discover"
          // TODO: wire up the "View in Discover" navigation in a later step.
          onClick={onClose}
        >
          {i18n.translate('xpack.streams.streamsCanvas.viewInDiscover', {
            defaultMessage: 'View in Discover',
          })}{' '}
          <EuiIcon type="popout" size="s" />
        </EuiContextMenuItem>,
        deleteItem,
      ]
    : [selectStreamItem, deleteItem];

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

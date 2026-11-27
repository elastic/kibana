/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_CANVAS_CHROME_INSET, WORKFLOWS_SURFACE_RADIUS } from '@kbn/workflows-ui';

/** Floating-panel inset from the canvas edges (top, right, bottom). */
export const CANVAS_CONFIG_PANEL_MARGIN = WORKFLOWS_CANVAS_CHROME_INSET;
/** Minimum canvas remaining beside the panel (px). */
export const MIN_VISIBLE_CANVAS_PX = 320;
/** Default step/trigger config panel width — keep canvas readable beside it. */
export const DEFAULT_CONFIG_PANEL_WIDTH = 400;
export const MIN_CONFIG_PANEL_WIDTH = 360;
/** Expanded field editor: catalog tree (~340) + value pane — not full-bleed. */
export const FIELD_EDITOR_EXPANDED_PANEL_WIDTH = 900;

/** Width change per ArrowLeft / ArrowRight press on the resize separator. */
const KEYBOARD_RESIZE_STEP_PX = 16;
/** Width change per Shift + arrow press on the resize separator. */
const KEYBOARD_RESIZE_LARGE_STEP_PX = 64;

const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Widest the panel may get while leaving `MIN_VISIBLE_CANVAS_PX` of canvas beside it. */
export const getMaxConfigPanelWidth = (canvasWidth: number): number =>
  Math.max(
    MIN_CONFIG_PANEL_WIDTH,
    canvasWidth - MIN_VISIBLE_CANVAS_PX - CANVAS_CONFIG_PANEL_MARGIN * 2
  );

/** Keeps `width` between the minimum panel width and the canvas-bounded maximum. */
export const clampConfigPanelWidth = (width: number, canvasWidth: number): number =>
  Math.min(Math.max(width, MIN_CONFIG_PANEL_WIDTH), getMaxConfigPanelWidth(canvasWidth));

export interface CanvasConfigPanelShellProps {
  readonly width: number;
  /** Called once per committed resize (pointer release or key press), never while dragging. */
  readonly onWidthChange: (width: number) => void;
  /** Available canvas width (wrapper). Used to enforce min-visible-canvas. */
  readonly canvasWidth: number;
  readonly children: React.ReactNode;
  /**
   * Focus moves into the panel when it mounts and whenever this key changes
   * (e.g. a different step opened in the same shell), never on other re-renders.
   */
  readonly focusKey?: string | number;
  readonly 'data-test-subj'?: string;
}

/**
 * Canvas-bounded floating shell for step/trigger configuration.
 * Lives inside the graph region only — never a viewport EuiFlyout — so it can
 * coexist with the push-type execution flyout on the right.
 */
export function CanvasConfigPanelShell({
  width,
  onWidthChange,
  canvasWidth,
  children,
  focusKey,
  'data-test-subj': dataTestSubj = 'workflowStepConfigPanelContainer',
}: CanvasConfigPanelShellProps) {
  const { euiTheme } = useEuiTheme();
  const floatingShadow = useEuiShadow('m');
  const [isResizeHover, setIsResizeHover] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // Width while dragging: kept here so a drag re-renders only the shell and persists once on release.
  const [dragWidth, setDragWidth] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const maxWidth = getMaxConfigPanelWidth(canvasWidth);
  const clampedWidth = dragWidth ?? clampConfigPanelWidth(width, canvasWidth);

  // Move focus into the panel so keyboard users (and Escape) land in it after opening a step.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.contains(document.activeElement)) return;
    const firstTabbable = contentRef.current?.querySelector<HTMLElement>(TABBABLE_SELECTOR);
    (firstTabbable ?? container).focus({ preventScroll: true });
  }, [focusKey]);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      setIsResizing(true);
      const startX = event.clientX;
      const startWidth = clampedWidth;
      let latestWidth = startWidth;
      const onMove = (ev: PointerEvent) => {
        // Left-edge resize: drag left → wider.
        const delta = startX - ev.clientX;
        latestWidth = clampConfigPanelWidth(startWidth + delta, canvasWidth);
        setDragWidth(latestWidth);
      };
      const onUp = (ev: PointerEvent) => {
        setIsResizing(false);
        setDragWidth(undefined);
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        if (latestWidth !== startWidth) onWidthChange(latestWidth);
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    },
    [canvasWidth, clampedWidth, onWidthChange]
  );

  const handleResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? KEYBOARD_RESIZE_LARGE_STEP_PX : KEYBOARD_RESIZE_STEP_PX;
      // The separator is the panel's left edge: ArrowLeft moves it left → wider.
      const nextByKey: Readonly<Record<string, number>> = {
        ArrowLeft: clampedWidth + step,
        ArrowRight: clampedWidth - step,
        Home: MIN_CONFIG_PANEL_WIDTH,
        End: maxWidth,
      };
      const requested = nextByKey[event.key];
      if (requested === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      const next = clampConfigPanelWidth(requested, canvasWidth);
      if (next !== clampedWidth) onWidthChange(next);
    },
    [canvasWidth, clampedWidth, maxWidth, onWidthChange]
  );

  const showResizeCue = isResizeHover || isResizing;

  return (
    <div
      css={[
        {
          position: 'absolute',
          top: CANVAS_CONFIG_PANEL_MARGIN,
          right: CANVAS_CONFIG_PANEL_MARGIN,
          bottom: CANVAS_CONFIG_PANEL_MARGIN,
          width: clampedWidth,
          zIndex: euiTheme.levels.flyout,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
          borderRadius: WORKFLOWS_SURFACE_RADIUS,
          background: euiTheme.colors.backgroundBasePlain,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          // The container is only a programmatic focus fallback, not an interactive control.
          '&:focus': { outline: 'none' },
        },
        floatingShadow,
      ]}
      ref={containerRef}
      role="region"
      aria-label={i18n.translate('workflows.visualEditor.configPanelRegionLabel', {
        defaultMessage: 'Configuration panel',
      })}
      // Programmatic focus target when the content has nothing tabbable.
      tabIndex={-1}
      data-test-subj={dataTestSubj}
    >
      {/*
        Sit above field-editor overlays (z-index 3) so the left edge stays
        draggable while the expanded editor is open.
      */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-valuenow={Math.round(clampedWidth)}
        aria-valuemin={MIN_CONFIG_PANEL_WIDTH}
        aria-valuemax={Math.round(maxWidth)}
        aria-label={i18n.translate('workflows.visualEditor.resizeConfigPanel', {
          defaultMessage: 'Resize configuration panel',
        })}
        data-test-subj="workflowStepConfigPanelResizeHandle"
        onPointerDown={handleResizeStart}
        onKeyDown={handleResizeKeyDown}
        onPointerEnter={() => setIsResizeHover(true)}
        onPointerLeave={() => setIsResizeHover(false)}
        css={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 8,
          cursor: 'ew-resize',
          zIndex: 4,
          touchAction: 'none',
          '&:focus-visible': {
            outline: `${euiTheme.focus.width} solid ${euiTheme.focus.color}`,
            outlineOffset: `-${euiTheme.focus.width}`,
          },
          // Visual cue on the panel's left edge while hovering / dragging.
          boxShadow: showResizeCue
            ? `inset 2px 0 0 0 ${euiTheme.colors.borderStrongPrimary}`
            : undefined,
        }}
      />
      <div
        ref={contentRef}
        css={{
          flex: '1 1 auto',
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}

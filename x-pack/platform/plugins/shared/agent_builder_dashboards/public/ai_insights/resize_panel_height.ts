/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BehaviorSubject } from 'rxjs';
import { AI_INSIGHTS_STRIP_GRID_HEIGHT } from '../../common/ai_insights/constants';

/** Matches dashboard grid row height (see dashboard_renderer/grid/constants). */
const GRID_ROW_HEIGHT_PX = 20;
/** Matches dashboard grid gutter when useMargins is on. */
const GRID_GUTTER_PX = 8;
const MAX_GRID_ROWS = 40;

/** CTA strip (header + CTA row) should never need more than this many rows. */
export const AI_INSIGHTS_STRIP_MAX_GRID_HEIGHT = 8;

/** Extra px so descenders / button edges aren't clipped after rounding to grid rows. */
const HEIGHT_SAFETY_BUFFER_PX = 4;

/** Collapsed header-only strip should never need more than this many rows. */
export const AI_INSIGHTS_COLLAPSED_MAX_GRID_HEIGHT = 3;

interface PanelGrid {
  h: number;
  w: number;
  x: number;
  y: number;
  sectionId?: string;
}

interface DashboardLayoutLike {
  panels: Record<string, { type: string; grid: PanelGrid }>;
  sections: unknown;
  pinnedPanels: unknown;
}

interface ParentWithLayout {
  layout$: BehaviorSubject<DashboardLayoutLike>;
}

function hasLayoutApi(parentApi: unknown): parentApi is ParentWithLayout {
  if (!parentApi || typeof parentApi !== 'object') {
    return false;
  }
  const layout$ = (parentApi as ParentWithLayout).layout$;
  return Boolean(
    layout$ && typeof layout$.getValue === 'function' && typeof layout$.next === 'function'
  );
}

/**
 * Converts a content pixel height into dashboard grid rows so the panel hugs
 * its content instead of leaving empty vertical space.
 */
export function contentHeightToGridRows(heightPx: number): number {
  if (!Number.isFinite(heightPx) || heightPx <= 0) {
    return AI_INSIGHTS_STRIP_GRID_HEIGHT;
  }

  // h * rowHeight + (h - 1) * gutter >= heightPx
  const rows = Math.ceil(
    (heightPx + HEIGHT_SAFETY_BUFFER_PX + GRID_GUTTER_PX) / (GRID_ROW_HEIGHT_PX + GRID_GUTTER_PX)
  );
  return Math.min(MAX_GRID_ROWS, Math.max(1, rows));
}

/**
 * Intrinsic height of a box from its children + padding/border/gap — ignores
 * parent flex stretch that would inflate offsetHeight/getBoundingClientRect.
 */
export function measureIntrinsicHeight(node: HTMLElement): number {
  const style = getComputedStyle(node);
  const paddingY =
    (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const borderY =
    (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  const gap = parseFloat(style.rowGap || style.gap || '0') || 0;

  const children = Array.from(node.children) as HTMLElement[];
  if (children.length === 0) {
    return Math.ceil(paddingY + borderY);
  }

  let contentHeight = 0;
  for (const child of children) {
    // Prefer scrollHeight so overflow-clipped ancestors don't under-report.
    const rectHeight = child.getBoundingClientRect().height;
    const scrollHeight = child.scrollHeight;
    contentHeight += Math.max(rectHeight, scrollHeight);
  }
  contentHeight += gap * Math.max(0, children.length - 1);

  const summed = contentHeight + paddingY + borderY;
  // scrollHeight on the shell itself is another signal when children under-report.
  return Math.ceil(Math.max(summed, node.scrollHeight));
}

/** Current dashboard grid height for this panel, if the parent exposes layout$. */
export function getAiInsightsPanelGridHeight(
  parentApi: unknown,
  uuid: string
): number | undefined {
  if (!hasLayoutApi(parentApi)) {
    return undefined;
  }
  return parentApi.layout$.getValue().panels[uuid]?.grid?.h;
}

interface ParentWithSetLayout extends ParentWithLayout {
  setLayout?: (id: string, newLayout: { type: string; grid: PanelGrid }) => void;
  getLayout?: (id: string) => { type: string; grid: PanelGrid } | undefined;
}

/**
 * Sets this panel's dashboard grid height. Returns the previous height when
 * the layout was updated, otherwise undefined.
 */
export function setAiInsightsPanelGridHeight(
  parentApi: unknown,
  uuid: string,
  height: number
): number | undefined {
  if (!hasLayoutApi(parentApi)) {
    return undefined;
  }

  const parent = parentApi as ParentWithSetLayout;
  const layout = parent.layout$.getValue();
  const panel = layout.panels[uuid] ?? parent.getLayout?.(uuid);
  if (!panel?.grid) {
    return undefined;
  }

  const previousHeight = panel.grid.h;
  if (previousHeight === height) {
    return previousHeight;
  }

  const nextPanel = {
    ...panel,
    grid: {
      ...panel.grid,
      h: height,
    },
  };

  // Prefer setLayout when available so dashboard layout manager stays consistent.
  if (typeof parent.setLayout === 'function') {
    parent.setLayout(uuid, nextPanel);
  } else {
    parent.layout$.next({
      ...layout,
      panels: {
        ...layout.panels,
        [uuid]: nextPanel,
      },
    });
  }

  return previousHeight;
}

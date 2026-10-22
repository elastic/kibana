/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PanelPixelPosition } from './dashboard_panel_layout';
import { setExplicitRect } from './layout_shim';
import type { ShimUsageLog } from './shim_usage_log';

/**
 * Height of `figcaption.embPanel__header` (`euiTheme.size.xl`, see
 * `presentation_panel_header.tsx`'s `headerStyles`). Duplicated here for the same reason
 * `dashboard_panel_layout.ts` duplicates the grid constants: it isn't importable from a
 * server-side worker. Drift risk: if the header height changes, content sizes are off by
 * the difference.
 */
export const EMB_PANEL_HEADER_HEIGHT_PX = 32;

/** The dashboard grid item wrapper's DOM id (`dashboard_grid_item.tsx`: `id={`panel-${id}`}`). */
export const gridItemDomId = (panelIndex: string) => `panel-${panelIndex}`;

/**
 * `EuiDataGrid`'s header row height (`euiTheme.size.xl`). EUI reads it with a ResizeObserver
 * and offsets every body row by it; an element with no rect of its own inherits its panel's
 * whole box, which made the header "460px tall" and pushed every row out of view.
 */
export const EUI_DATA_GRID_HEADER_HEIGHT_PX = 32;

const GRID_ITEM_ID_PREFIX = 'panel-';

/** The `panelIndex` of the dashboard grid item wrapping `element`, if any (inverse of {@link gridItemDomId}). */
export const findPanelIndexForElement = (element: Element): string | undefined => {
  for (let el: Element | null = element; el; el = el.parentElement) {
    if (el.id && el.id.startsWith(GRID_ITEM_ID_PREFIX)) {
      return el.id.slice(GRID_ITEM_ID_PREFIX.length);
    }
  }
  return undefined;
};

const firstByClass = (root: Element, className: string): Element | undefined =>
  // `getElementsByClassName`, not `querySelector`: no selector compilation involved.
  root.getElementsByClassName(className)[0];

interface AssignedPanel {
  gridItem: Element;
  hadHeader: boolean;
  hadContent: boolean;
  gridHeaders: number;
}

export interface PanelRectAssigner {
  dispose: () => void;
  /** Grid item wrappers found so far, by `panelIndex`. */
  assigned: Map<string, Element>;
}

/**
 * Jsdom has no layout engine, so nothing ever tells a mounted panel how big it is: charts
 * fall back to a made-up size, and `EuiDataGrid` renders nothing at width 0. This assigns
 * each dashboard panel the pixel box `computePanelPixelPositions` derived from the saved
 * object's own grid data -- on the grid item wrapper, the `[data-shared-item]` figure, and
 * the `.embPanel__content` (the figure's box minus the title header, when it has one) --
 * the moment they mount. `setExplicitRect` re-fires any `ResizeObserver` already watching
 * something beneath them, so components that measured themselves on mount learn their size.
 *
 * Panels are found by the grid item's stable `panel-${panelIndex}` id, not by DOM order:
 * panels mount in an order unrelated to their position.
 */
export const installPanelRectAssigner = (
  env: { window: { MutationObserver: unknown }; document: Document },
  positions: PanelPixelPosition[],
  usageLog: ShimUsageLog
): PanelRectAssigner => {
  const assigned = new Map<string, Element>();
  const state = new Map<string, AssignedPanel>();

  const apply = () => {
    for (const position of positions) {
      const gridItem = env.document.getElementById(gridItemDomId(position.panelIndex));
      if (!gridItem) continue;

      const figure = firstByClass(gridItem, 'embPanel');
      const header = figure ? firstByClass(figure, 'embPanel__header') : undefined;
      const content = figure ? firstByClass(figure, 'embPanel__content') : undefined;
      const gridHeaders = content ? content.getElementsByClassName('euiDataGridHeader').length : 0;
      const previous = state.get(position.panelIndex);
      const unchanged =
        previous?.gridItem === gridItem &&
        previous.hadHeader === Boolean(header) &&
        previous.hadContent === Boolean(content) &&
        previous.gridHeaders === gridHeaders;
      if (unchanged) continue;

      const { left, top, width, height } = position;
      setExplicitRect(gridItem, { width, height, left, top });
      if (content) {
        for (const gridHeader of Array.from(content.getElementsByClassName('euiDataGridHeader'))) {
          setExplicitRect(gridHeader, { width, height: EUI_DATA_GRID_HEADER_HEIGHT_PX });
        }
      }
      if (figure) {
        setExplicitRect(figure, { width, height, left, top });
      }
      if (content) {
        const headerHeight = header ? EMB_PANEL_HEADER_HEIGHT_PX : 0;
        setExplicitRect(content, { width, height: Math.max(0, height - headerHeight) });
      }
      if (!previous) {
        usageLog.record('panelRect.assigned', position.panelIndex);
      }
      state.set(position.panelIndex, {
        gridItem,
        hadHeader: Boolean(header),
        hadContent: Boolean(content),
        gridHeaders,
      });
      assigned.set(position.panelIndex, gridItem);
    }
  };

  const Observer = env.window.MutationObserver as typeof MutationObserver;
  const observer = new Observer(apply);
  observer.observe(env.document.documentElement ?? env.document, {
    childList: true,
    subtree: true,
  });
  apply();

  return { dispose: () => observer.disconnect(), assigned };
};

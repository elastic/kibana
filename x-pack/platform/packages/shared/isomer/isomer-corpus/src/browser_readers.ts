/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Functions in this file run in the browser through `browser.execute`, which sends their source
 * text. Each must be self-contained: no imports, no references to module scope. Each returns a JSON
 * string, so values survive WebDriver's serialization unchanged.
 */

/** A text-bearing element, in document order, with the colors it was drawn with. */
export interface DomTextReading {
  text: string;
  tag: string;
  className: string;
  testSubj: string | null;
  ariaLabel: string | null;
  inlineColor: string;
  inlineBackgroundColor: string;
  color: string;
  backgroundColor: string;
}

export interface MetricReading {
  ariaLabel: string | null;
  inlineBackgroundColor: string;
  backgroundColor: string;
  texts: DomTextReading[];
}

export interface DataGridCellReading extends DomTextReading {
  row: number;
  column: number;
}

export interface DataGridReading {
  headers: DomTextReading[];
  cells: DataGridCellReading[];
  /** Total rows and columns the grid reports (`aria-rowcount` / `aria-colcount`), when set. */
  rowCount: number | null;
  columnCount: number | null;
}

/** An SVG text a chart drew, such as a word of a tag cloud, which reports no `DebugState`. */
export interface SvgTextReading {
  text: string;
  fill: string;
  fontSize: string;
}

export interface ChartReading {
  renderComplete: boolean;
  renderCount: number | null;
  rect: { width: number; height: number };
  /** Elastic Charts' `DebugState`, parsed from `data-ech-debug-state`; `null` when it wasn't on. */
  debugState: unknown;
  /** The SVG texts the chart drew, in document order. */
  svgTexts: SvgTextReading[];
}

/** A legacy metric tile (`legacyMtrVis`): its value and label, and the background it sits on. */
export interface LegacyMetricReading {
  value: DomTextReading | null;
  label: DomTextReading | null;
  /** The nearest non-transparent background, from the tile up to the panel. */
  backgroundColor: string;
}

export interface PanelReading {
  found: boolean;
  /** The panel's size. Its position is the grid position in the as-code config. */
  rect: { width: number; height: number } | null;
  title: string | null;
  renderComplete: boolean;
  errorText: string | null;
  charts: ChartReading[];
  metrics: MetricReading[];
  dataGrids: DataGridReading[];
  legacyMetrics: LegacyMetricReading[];
}

export interface RenderContextReading {
  themeTag: string | null;
  timeZone: string;
  locale: string;
  navigatorLanguages: string[];
  devicePixelRatio: number;
  viewport: { width: number; height: number };
  userAgent: string;
  url: string;
}

/**
 * Reads one dashboard panel (`#panel-<id>`): its box, title, Elastic Charts `DebugState` for every
 * chart in it, and DOM readings for Elastic Charts metrics and EUI data grids.
 */
export function readPanel(panelId: string): string {
  const readText = (element: Element): DomTextReading => {
    const style = (element as HTMLElement).style;
    const computed = window.getComputedStyle(element);
    return {
      text: (element.textContent || '').trim(),
      tag: element.tagName.toLowerCase(),
      className: typeof element.className === 'string' ? element.className : '',
      testSubj: element.getAttribute('data-test-subj'),
      ariaLabel: element.getAttribute('aria-label'),
      inlineColor: style ? style.color : '',
      inlineBackgroundColor: style ? style.backgroundColor : '',
      color: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  };

  // Elements that carry their own text, so every string is read once, at its innermost owner.
  const readTextLeaves = (root: Element): DomTextReading[] =>
    Array.from(root.querySelectorAll('*'))
      .filter((element) =>
        Array.from(element.childNodes).some(
          (node) => node.nodeType === 3 && (node.textContent || '').trim() !== ''
        )
      )
      .map(readText);

  const readNumberAttribute = (element: Element, name: string): number | null => {
    const value = element.getAttribute(name);
    return value === null || value === '' ? null : Number(value);
  };

  const panel = document.getElementById(`panel-${panelId}`);
  if (!panel) {
    const missing: PanelReading = {
      found: false,
      rect: null,
      title: null,
      renderComplete: false,
      errorText: null,
      charts: [],
      metrics: [],
      dataGrids: [],
      legacyMetrics: [],
    };
    return JSON.stringify(missing);
  }

  const panelRect = panel.getBoundingClientRect();
  const titleElement = panel.querySelector('[data-test-subj="embeddablePanelTitle"]');
  const errorElement = panel.querySelector('[data-test-subj="embeddableError"]');
  const renderElement = panel.querySelector('[data-render-complete]');

  const charts: ChartReading[] = Array.from(panel.querySelectorAll('.echChart')).map((chart) => {
    const status = chart.querySelector('.echChartStatus');
    const debugText = status ? status.getAttribute('data-ech-debug-state') : null;
    const chartRect = chart.getBoundingClientRect();
    return {
      renderComplete: status ? status.getAttribute('data-ech-render-complete') === 'true' : false,
      renderCount: status ? readNumberAttribute(status, 'data-ech-render-count') : null,
      rect: { width: chartRect.width, height: chartRect.height },
      debugState: debugText ? JSON.parse(debugText) : null,
      svgTexts: Array.from(chart.querySelectorAll('svg text')).map((text) => ({
        text: (text.textContent || '').trim(),
        fill: text.getAttribute('fill') || window.getComputedStyle(text).fill,
        fontSize: text.getAttribute('font-size') || window.getComputedStyle(text).fontSize,
      })),
    };
  });

  const isTransparent = (color: string) =>
    color === '' || color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
  const legacyMetrics: LegacyMetricReading[] = Array.from(
    panel.querySelectorAll('.legacyMtrVis__container')
  ).map((tile) => {
    let backgroundColor = '';
    for (let element: Element | null = tile; element && element !== panel; ) {
      const color = window.getComputedStyle(element).backgroundColor;
      if (!isTransparent(color)) {
        backgroundColor = color;
        break;
      }
      element = element.parentElement;
    }
    const value = tile.querySelector('[data-test-subj="metric_value"]');
    const label = tile.querySelector('[data-test-subj="metric_label"]');
    return {
      value: value ? readText(value) : null,
      label: label ? readText(label) : null,
      backgroundColor,
    };
  });

  const metrics: MetricReading[] = Array.from(panel.querySelectorAll('.echMetric')).map(
    (metric) => {
      const own = readText(metric);
      return {
        ariaLabel: metric.getAttribute('aria-label'),
        inlineBackgroundColor: own.inlineBackgroundColor,
        backgroundColor: own.backgroundColor,
        texts: readTextLeaves(metric),
      };
    }
  );

  const dataGrids: DataGridReading[] = Array.from(panel.querySelectorAll('.euiDataGrid')).map(
    (grid) => {
      const gridRole = grid.querySelector('[role="grid"]') || grid;
      return {
        headers: Array.from(grid.querySelectorAll('[role="columnheader"]')).map(readText),
        cells: Array.from(grid.querySelectorAll('[role="gridcell"]')).map((cell) => ({
          ...readText(cell),
          row: Number(cell.getAttribute('data-gridcell-row-index')),
          column: Number(cell.getAttribute('data-gridcell-column-index')),
        })),
        rowCount: readNumberAttribute(gridRole, 'aria-rowcount'),
        columnCount: readNumberAttribute(gridRole, 'aria-colcount'),
      };
    }
  );

  const reading: PanelReading = {
    found: true,
    rect: { width: panelRect.width, height: panelRect.height },
    title: titleElement ? (titleElement.textContent || '').trim() : null,
    renderComplete: renderElement
      ? renderElement.getAttribute('data-render-complete') === 'true'
      : false,
    errorText: errorElement ? (errorElement.textContent || '').trim() : null,
    charts,
    metrics,
    dataGrids,
    legacyMetrics,
  };
  return JSON.stringify(reading);
}

/**
 * Reads the open inspector's `tables` adapter: Kibana's `Datatable`s for the inspected panel, keyed
 * as the adapter keys them. The adapters aren't on the page, so this searches React's fiber tree
 * around the inspector flyout for the `InspectorPanel` that received them as a prop. Non-finite numbers
 * are encoded as `{ "$number": "NaN" }` so JSON doesn't turn them into `null`; functions are
 * dropped and cycles are marked.
 */
export function readInspectorTables(): string {
  const panel = document.querySelector('[data-test-subj="inspectorPanel"]');
  if (!panel) {
    return JSON.stringify({ status: 'no_inspector' });
  }

  interface Fiber {
    memoizedProps?: Record<string, unknown> | null;
    return?: Fiber | null;
  }
  const getFiber = (element: Element): Fiber | null => {
    const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
    return key ? (element as unknown as Record<string, Fiber>)[key] : null;
  };

  // The flyout's content is mounted as its own React root inside the flyout element, so walk up
  // from the flyout and from each element inside it until a component received `adapters`.
  let adapters: Record<string, unknown> | null = null;
  const elements = [panel, ...Array.from(panel.querySelectorAll('*'))];
  for (let index = 0; index < elements.length && !adapters; index++) {
    for (
      let fiber: Fiber | null | undefined = getFiber(elements[index]);
      fiber && !adapters;
      fiber = fiber.return
    ) {
      const props = fiber.memoizedProps;
      if (props && typeof props.adapters === 'object' && props.adapters !== null) {
        adapters = props.adapters as Record<string, unknown>;
      }
    }
  }
  if (!adapters) {
    return JSON.stringify({ status: 'no_adapters' });
  }

  const tablesAdapter = adapters.tables as { tables?: Record<string, unknown> } | undefined;
  const toJsonSafe = (value: unknown, ancestors: object[]): unknown => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : { $number: String(value) };
    }
    if (typeof value === 'function' || typeof value === 'symbol') {
      return undefined;
    }
    if (typeof value === 'bigint') {
      return { $bigint: String(value) };
    }
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    if (ancestors.includes(value)) {
      return { $circular: true };
    }
    const toJSON = (value as { toJSON?: () => unknown }).toJSON;
    if (typeof toJSON === 'function') {
      return toJsonSafe(toJSON.call(value), ancestors);
    }
    const nextAncestors = ancestors.concat([value]);
    if (Array.isArray(value)) {
      return value.map((item) => toJsonSafe(item, nextAncestors));
    }
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = toJsonSafe((value as Record<string, unknown>)[key], nextAncestors);
    }
    return result;
  };

  return JSON.stringify({
    status: tablesAdapter ? 'ok' : 'no_tables_adapter',
    adapters: Object.keys(adapters),
    tables: toJsonSafe(tablesAdapter ? tablesAdapter.tables ?? {} : {}, []),
  });
}

/** The IDs of the panels the dashboard rendered, in page order. */
export function listRenderedPanelIds(): string {
  const ids = Array.from(document.querySelectorAll('[data-test-subj="dashboardPanel"]'))
    .map((panel) => panel.id)
    .filter((id) => id.startsWith('panel-'))
    .map((id) => id.slice('panel-'.length));
  return JSON.stringify(ids);
}

export interface PanelPlacement {
  found: boolean;
  rect: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
}

/** Scrolls a dashboard panel to the middle of the viewport and reads where it ended up. */
export function centerPanel(panelId: string): string {
  const panel = document.getElementById(`panel-${panelId}`);
  if (panel) {
    panel.scrollIntoView({ block: 'center', inline: 'nearest' });
  }
  const rect = panel ? panel.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
  const placement: PanelPlacement = {
    found: Boolean(panel),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    viewport: { width: window.innerWidth, height: window.innerHeight },
  };
  return JSON.stringify(placement);
}

/** Reads what the page renders with: theme, time zone, locale, pixel ratio and viewport. */
export function readRenderContext(): string {
  const reading: RenderContextReading = {
    themeTag: (window as Window & { __kbnThemeTag__?: string }).__kbnThemeTag__ ?? null,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: document.documentElement.lang,
    navigatorLanguages: Array.from(navigator.languages || []),
    devicePixelRatio: window.devicePixelRatio,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
  return JSON.stringify(reading);
}

/**
 * Whether every Elastic Charts chart on the page has rendered with its `DebugState` attached. Metric
 * charts are skipped: Elastic Charts doesn't report `DebugState` for them, so they're read from the
 * DOM instead.
 */
export function allChartsHaveDebugState(): boolean {
  return Array.from(document.querySelectorAll('.echChart'))
    .filter((chart) => !chart.querySelector('.echMetric'))
    .every((chart) => {
      const status = chart.querySelector('.echChartStatus');
      return (
        status !== null &&
        status.getAttribute('data-ech-render-complete') === 'true' &&
        Boolean(status.getAttribute('data-ech-debug-state'))
      );
    });
}

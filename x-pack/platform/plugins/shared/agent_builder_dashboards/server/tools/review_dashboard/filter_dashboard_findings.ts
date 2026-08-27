/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type { PanelCatalogEntry } from './catalog_dashboard_panels';
import type {
  ControlCatalogEntry,
  DashboardFinding,
  DuplicateInnerTitleFinding,
  MetricFillFinding,
  MonotoneChartTypesFinding,
  OneCategoryChartFinding,
  PackLayoutFinding,
  PackLayoutPanelFix,
  PanelGrid,
  SectionCatalogEntry,
  ThinMetricFinding,
  WeakControlsFinding,
  WeakSectionsFinding,
  WrongChartTypeFinding,
} from './types';

const VARIETY_CAP = 3;
const OPTIONS_LIST_CAP = 3;
const ONE_CATEGORY_CAP = 3;
const THIN_METRIC_CAP = 4;
const MIN_TABLE_WIDTH = 24;
const VARIETY_SKIP_CHART_TYPES = new Set(['metric', 'gauge', 'data_table']);
const ONE_CATEGORY_TARGETS = new Set(['metric', 'pie']);
const ONE_CATEGORY_SKIP_CHART_TYPES = new Set(['metric', 'gauge', 'pie', 'data_table']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const parseGrid = (value: unknown): PanelGrid | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const { x, y, w, h } = value;
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(w) || !isFiniteNumber(h)) {
    return undefined;
  }
  if (w < 1 || h < 1 || w > 48 || x < 0 || y < 0 || x + w > 48) {
    return undefined;
  }
  return { x, y, w, h };
};

const parsePackLayout = (finding: Record<string, unknown>): PackLayoutFinding | undefined => {
  if (
    !isRecord(finding.fix) ||
    !Array.isArray(finding.fix.panels) ||
    !isNonEmptyString(finding.what)
  ) {
    return undefined;
  }
  const panels: PackLayoutPanelFix[] = [];
  for (const item of finding.fix.panels) {
    if (!isRecord(item) || !isNonEmptyString(item.panel_id)) {
      return undefined;
    }
    const grid = parseGrid(item.grid);
    if (!grid) {
      return undefined;
    }
    const sectionId = item.section_id;
    if (sectionId !== undefined && sectionId !== null && !isNonEmptyString(sectionId)) {
      return undefined;
    }
    panels.push({
      panel_id: item.panel_id,
      grid,
      ...(sectionId === undefined ? {} : { section_id: sectionId }),
    });
  }
  return { rule: 'pack_layout', what: finding.what, fix: { panels } };
};

const parseWeakSections = (finding: Record<string, unknown>): WeakSectionsFinding | undefined => {
  if (
    !isRecord(finding.fix) ||
    !Array.isArray(finding.fix.sections) ||
    !isNonEmptyString(finding.what)
  ) {
    return undefined;
  }
  const sections: WeakSectionsFinding['fix']['sections'] = [];
  for (const item of finding.fix.sections) {
    if (
      !isRecord(item) ||
      !isNonEmptyString(item.id) ||
      !isNonEmptyString(item.title) ||
      !Array.isArray(item.panel_ids)
    ) {
      return undefined;
    }
    const panelIds = item.panel_ids.filter(isNonEmptyString);
    if (panelIds.length !== item.panel_ids.length || panelIds.length === 0) {
      return undefined;
    }
    sections.push({ id: item.id, title: item.title, panel_ids: panelIds });
  }
  if (sections.length === 0) {
    return undefined;
  }
  return { rule: 'weak_sections', what: finding.what, fix: { sections } };
};

const parseChartTypeFix = (value: unknown): { chartType: string } | undefined => {
  if (!isRecord(value) || !isNonEmptyString(value.chartType)) {
    return undefined;
  }
  return { chartType: value.chartType };
};

const parseWrongChartType = (
  finding: Record<string, unknown>
): WrongChartTypeFinding | undefined => {
  const fix = parseChartTypeFix(finding.fix);
  if (!isNonEmptyString(finding.panel_id) || !isNonEmptyString(finding.what) || !fix) {
    return undefined;
  }
  return { rule: 'wrong_chart_type', panel_id: finding.panel_id, what: finding.what, fix };
};

const parseDuplicateInnerTitle = (
  finding: Record<string, unknown>
): DuplicateInnerTitleFinding | undefined => {
  if (
    !isNonEmptyString(finding.panel_id) ||
    !isNonEmptyString(finding.what) ||
    !isRecord(finding.fix) ||
    finding.fix.hide_title !== true
  ) {
    return undefined;
  }
  return {
    rule: 'duplicate_inner_title',
    panel_id: finding.panel_id,
    what: finding.what,
    fix: { hide_title: true },
  };
};

const parseOneCategoryChart = (
  finding: Record<string, unknown>
): OneCategoryChartFinding | undefined => {
  const fix = parseChartTypeFix(finding.fix);
  if (!isNonEmptyString(finding.panel_id) || !isNonEmptyString(finding.what) || !fix) {
    return undefined;
  }
  if (!ONE_CATEGORY_TARGETS.has(fix.chartType)) {
    return undefined;
  }
  return { rule: 'one_category_chart', panel_id: finding.panel_id, what: finding.what, fix };
};

const parseMetricFill = (finding: Record<string, unknown>): MetricFillFinding | undefined => {
  if (
    !isNonEmptyString(finding.panel_id) ||
    !isNonEmptyString(finding.what) ||
    !isRecord(finding.fix) ||
    finding.fix.clear_background !== true
  ) {
    return undefined;
  }
  return {
    rule: 'metric_fill',
    panel_id: finding.panel_id,
    what: finding.what,
    fix: { clear_background: true },
  };
};

const parseThinMetric = (finding: Record<string, unknown>): ThinMetricFinding | undefined => {
  if (
    !isNonEmptyString(finding.panel_id) ||
    !isNonEmptyString(finding.what) ||
    !isRecord(finding.fix) ||
    finding.fix.enhance !== 'trendline'
  ) {
    return undefined;
  }
  return {
    rule: 'thin_metric',
    panel_id: finding.panel_id,
    what: finding.what,
    fix: { enhance: 'trendline' },
  };
};

const parseMonotone = (finding: Record<string, unknown>): MonotoneChartTypesFinding | undefined => {
  if (
    !isRecord(finding.fix) ||
    !Array.isArray(finding.fix.changes) ||
    !isNonEmptyString(finding.what)
  ) {
    return undefined;
  }
  const changes: MonotoneChartTypesFinding['fix']['changes'] = [];
  for (const item of finding.fix.changes) {
    if (!isRecord(item) || !isNonEmptyString(item.panel_id) || !isNonEmptyString(item.chartType)) {
      return undefined;
    }
    changes.push({ panel_id: item.panel_id, chartType: item.chartType });
  }
  if (changes.length === 0) {
    return undefined;
  }
  return { rule: 'monotone_chart_types', what: finding.what, fix: { changes } };
};

const parseWeakControls = (finding: Record<string, unknown>): WeakControlsFinding | undefined => {
  if (
    !isRecord(finding.fix) ||
    !Array.isArray(finding.fix.add) ||
    !isNonEmptyString(finding.what)
  ) {
    return undefined;
  }
  const add: WeakControlsFinding['fix']['add'] = [];
  for (const item of finding.fix.add) {
    if (
      !isRecord(item) ||
      item.type !== OPTIONS_LIST_CONTROL ||
      !isNonEmptyString(item.field_name) ||
      !isNonEmptyString(item.index)
    ) {
      return undefined;
    }
    add.push({
      type: OPTIONS_LIST_CONTROL,
      field_name: item.field_name,
      index: item.index,
      ...(isNonEmptyString(item.title) ? { title: item.title } : {}),
    });
  }
  if (add.length === 0) {
    return undefined;
  }
  return { rule: 'weak_controls', what: finding.what, fix: { add } };
};

const isCompletePack = ({
  finding,
  panels,
  allowedSectionIds,
}: {
  finding: PackLayoutFinding;
  panels: PanelCatalogEntry[];
  allowedSectionIds: Set<string>;
}): boolean => {
  if (finding.fix.panels.length !== panels.length) {
    return false;
  }
  const seen = new Set<string>();
  const panelsById = new Map(panels.map((entry) => [entry.id, entry]));
  for (const item of finding.fix.panels) {
    if (seen.has(item.panel_id) || !panelsById.has(item.panel_id)) {
      return false;
    }
    seen.add(item.panel_id);
    const catalogPanel = panelsById.get(item.panel_id);
    if (catalogPanel?.chart_type === 'data_table' && item.grid.w < MIN_TABLE_WIDTH) {
      return false;
    }
    if (item.section_id != null && !allowedSectionIds.has(item.section_id)) {
      return false;
    }
  }
  return seen.size === panels.length;
};

const isValidWeakSections = ({
  finding,
  panels,
  sections,
}: {
  finding: WeakSectionsFinding;
  panels: PanelCatalogEntry[];
  sections: SectionCatalogEntry[];
}): boolean => {
  if (sections.length > 0) {
    return false;
  }
  const panelIds = new Set(panels.map((entry) => entry.id));
  const seenSectionIds = new Set<string>();
  const seenPanelIds = new Set<string>();
  for (const section of finding.fix.sections) {
    if (seenSectionIds.has(section.id)) {
      return false;
    }
    seenSectionIds.add(section.id);
    for (const panelId of section.panel_ids) {
      if (!panelIds.has(panelId) || seenPanelIds.has(panelId)) {
        return false;
      }
      seenPanelIds.add(panelId);
    }
  }
  return true;
};

const hasMonotoneMajority = (panels: PanelCatalogEntry[]): boolean => {
  const typed = panels
    .map((entry) => entry.chart_type)
    .filter(
      (chartType): chartType is string => typeof chartType === 'string' && chartType.length > 0
    );
  if (typed.length < 2) {
    return false;
  }
  const counts = new Map<string, number>();
  for (const chartType of typed) {
    counts.set(chartType, (counts.get(chartType) ?? 0) + 1);
  }
  const majority = Math.max(...counts.values());
  return majority * 2 > typed.length;
};

const catalogContainsFieldAndIndex = ({
  panels,
  fieldName,
  index,
}: {
  panels: PanelCatalogEntry[];
  fieldName: string;
  index: string;
}): boolean => {
  const queries = panels.map((entry) => entry.esql).filter(isNonEmptyString);
  return (
    queries.some((esql) => esql.includes(fieldName)) && queries.some((esql) => esql.includes(index))
  );
};

export const filterDashboardFindings = ({
  findings,
  panels,
  controls,
  sections,
}: {
  findings: unknown[];
  panels: PanelCatalogEntry[];
  controls: ControlCatalogEntry[];
  sections: SectionCatalogEntry[];
}): DashboardFinding[] => {
  const parsed: DashboardFinding[] = [];
  for (const finding of findings) {
    if (!isRecord(finding) || !isNonEmptyString(finding.rule)) {
      continue;
    }
    switch (finding.rule) {
      case 'pack_layout': {
        const next = parsePackLayout(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'weak_sections': {
        const next = parseWeakSections(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'wrong_chart_type': {
        const next = parseWrongChartType(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'duplicate_inner_title': {
        const next = parseDuplicateInnerTitle(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'one_category_chart': {
        const next = parseOneCategoryChart(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'metric_fill': {
        const next = parseMetricFill(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'thin_metric': {
        const next = parseThinMetric(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'monotone_chart_types': {
        const next = parseMonotone(finding);
        if (next) parsed.push(next);
        break;
      }
      case 'weak_controls': {
        const next = parseWeakControls(finding);
        if (next) parsed.push(next);
        break;
      }
      default:
        break;
    }
  }

  const panelIds = new Set(panels.map((entry) => entry.id));
  const panelsById = new Map(panels.map((entry) => [entry.id, entry]));
  const invertPanelIds = new Set(
    parsed
      .filter((finding): finding is WrongChartTypeFinding => finding.rule === 'wrong_chart_type')
      .filter((finding) => panelIds.has(finding.panel_id))
      .map((finding) => finding.panel_id)
  );

  const isEligibleOneCategory = (finding: OneCategoryChartFinding): boolean => {
    if (invertPanelIds.has(finding.panel_id)) {
      return false;
    }
    const panel = panelsById.get(finding.panel_id);
    if (!panel?.chart_type || ONE_CATEGORY_SKIP_CHART_TYPES.has(panel.chart_type)) {
      return false;
    }
    return true;
  };

  const isEligibleThinMetric = (finding: ThinMetricFinding): boolean => {
    const panel = panelsById.get(finding.panel_id);
    return (
      panel?.chart_type === 'metric' &&
      panel.has_secondary_metric !== true &&
      panel.background_chart === undefined
    );
  };

  const oneCategoryPanelIds = new Set(
    parsed
      .filter(
        (finding): finding is OneCategoryChartFinding => finding.rule === 'one_category_chart'
      )
      .filter(isEligibleOneCategory)
      .slice(0, ONE_CATEGORY_CAP)
      .map((finding) => finding.panel_id)
  );

  const dropdownCount = controls.filter((control) => control.type === OPTIONS_LIST_CONTROL).length;
  const kept: DashboardFinding[] = [];
  const plannedSectionIds = new Set<string>();
  let oneCategoryKept = 0;
  let thinMetricKept = 0;

  for (const finding of parsed) {
    if (finding.rule === 'weak_sections') {
      if (!isValidWeakSections({ finding, panels, sections })) {
        continue;
      }
      for (const section of finding.fix.sections) {
        plannedSectionIds.add(section.id);
      }
      kept.push(finding);
      continue;
    }

    if (finding.rule === 'wrong_chart_type') {
      if (panelIds.has(finding.panel_id)) {
        kept.push(finding);
      }
      continue;
    }

    if (finding.rule === 'duplicate_inner_title') {
      const panel = panelsById.get(finding.panel_id);
      if (panel && panel.hide_title !== true) {
        kept.push(finding);
      }
      continue;
    }

    if (finding.rule === 'one_category_chart') {
      if (isEligibleOneCategory(finding) && oneCategoryKept < ONE_CATEGORY_CAP) {
        oneCategoryKept += 1;
        kept.push(finding);
      }
      continue;
    }

    if (finding.rule === 'metric_fill') {
      const panel = panelsById.get(finding.panel_id);
      if (panel?.chart_type === 'metric' && panel.apply_color_to === 'background') {
        kept.push(finding);
      }
      continue;
    }

    if (finding.rule === 'thin_metric') {
      if (isEligibleThinMetric(finding) && thinMetricKept < THIN_METRIC_CAP) {
        thinMetricKept += 1;
        kept.push(finding);
      }
      continue;
    }

    if (finding.rule === 'pack_layout') {
      const allowedSectionIds = new Set([
        ...sections.map((section) => section.id),
        ...plannedSectionIds,
      ]);
      if (isCompletePack({ finding, panels, allowedSectionIds })) {
        kept.push(finding);
      }
      continue;
    }

    if (finding.rule === 'monotone_chart_types') {
      if (!hasMonotoneMajority(panels)) {
        continue;
      }
      const changes = finding.fix.changes.filter((change) => {
        if (
          !panelIds.has(change.panel_id) ||
          invertPanelIds.has(change.panel_id) ||
          oneCategoryPanelIds.has(change.panel_id)
        ) {
          return false;
        }
        const chartType = panelsById.get(change.panel_id)?.chart_type;
        return chartType === undefined || !VARIETY_SKIP_CHART_TYPES.has(chartType);
      });
      const capped = changes.slice(0, VARIETY_CAP);
      if (capped.length > 0) {
        kept.push({ ...finding, fix: { changes: capped } });
      }
      continue;
    }

    if (finding.rule !== 'weak_controls') {
      continue;
    }

    if (dropdownCount >= 2) {
      continue;
    }
    const add = finding.fix.add
      .filter((control) =>
        catalogContainsFieldAndIndex({
          panels,
          fieldName: control.field_name,
          index: control.index,
        })
      )
      .slice(0, OPTIONS_LIST_CAP);
    if (add.length > 0) {
      kept.push({ ...finding, fix: { add } });
    }
  }

  return kept;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dashboardAttachmentDataSchema,
  isSection,
  type AttachmentPanel,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  metricConfigSchemaESQL,
  pieConfigSchemaESQL,
  tagcloudConfigSchemaESQL,
  xyConfigSchemaESQL,
  xyConfigSchemaNoESQL,
} from '@kbn/lens-embeddable-utils';
import type { z } from '@kbn/zod';
import { findViolations, type DashboardRuleId } from '../evaluators/dashboard_rules';
import { isSeedDefect } from '../evaluators/seed_defects';
import { getLeafPanels, getPanelKind } from '../dashboard_panels';
import { DISSECT_DERIVED_COLUMNS, DISSECT_LOGS_RESULTS } from './dissect_logs_results';
import { MESSY_LOGS_DASHBOARD, MESSY_LOGS_DASHBOARD_DEFECTS } from './messy_logs_dashboard';
import { SAMPLE_LOGS_MAPPED_FIELDS } from './sample_logs_fields';
import { SECTIONED_LOGS_DASHBOARD } from './sectioned_logs_dashboard';

const isEsqlLensPanel = ({ type, config }: AttachmentPanel): boolean =>
  type === LENS_EMBEDDABLE_TYPE && JSON.stringify(config).includes('"type":"esql"');

const LENS_SCHEMA_BY_KIND: Record<string, z.ZodType> = {
  metric: metricConfigSchemaESQL,
  xy: xyConfigSchemaESQL,
  pie: pieConfigSchemaESQL,
  tag_cloud: tagcloudConfigSchemaESQL,
};

describe('seeded messy logs dashboard', () => {
  it('parses against the dashboard attachment schema', () => {
    const parsed = dashboardAttachmentDataSchema.safeParse(MESSY_LOGS_DASHBOARD);
    expect(parsed.success ? undefined : parsed.error.issues).toBeUndefined();
  });

  it('has ES|QL Lens panels that parse against the ES|QL chart schemas', () => {
    const lensPanels = getLeafPanels(MESSY_LOGS_DASHBOARD).filter(isEsqlLensPanel);
    expect(lensPanels.length).toBeGreaterThan(0);
    for (const panel of lensPanels) {
      const schema = LENS_SCHEMA_BY_KIND[getPanelKind(panel)];
      expect(schema).toBeDefined();
      const parsed = schema.safeParse(panel.config);
      expect(
        parsed.success ? undefined : { panel: panel.id, issues: parsed.error.issues }
      ).toBeUndefined();
    }
  });

  it('keeps a data-view Lens, a Vega and an ML panel the agent must leave alone', () => {
    const kinds = getLeafPanels(MESSY_LOGS_DASHBOARD).map(({ type }) => type);
    expect(kinds).toEqual(expect.arrayContaining(['vega', 'ml_anomaly_swimlane']));
    const dataViewPanel = getLeafPanels(MESSY_LOGS_DASHBOARD).find(
      (panel) => panel.type === LENS_EMBEDDABLE_TYPE && !isEsqlLensPanel(panel)
    );
    const parsed = xyConfigSchemaNoESQL.safeParse(dataViewPanel?.config);
    expect(parsed.success ? undefined : parsed.error.issues).toBeUndefined();
  });

  it('shows every rule defect it declares', () => {
    const ruleDefects = MESSY_LOGS_DASHBOARD_DEFECTS.filter(
      (defect): defect is DashboardRuleId => !isSeedDefect(defect)
    );
    const missing = ruleDefects.filter(
      (rule) => findViolations(MESSY_LOGS_DASHBOARD, [rule]).length === 0
    );
    expect(missing).toEqual([]);
  });

  it('has sections nowhere, so every panel is a leaf', () => {
    expect(MESSY_LOGS_DASHBOARD.panels.some(isSection)).toBe(false);
  });
});

describe('sectioned logs dashboard', () => {
  it('parses against the dashboard attachment schema, controls included', () => {
    const parsed = dashboardAttachmentDataSchema.safeParse(SECTIONED_LOGS_DASHBOARD);
    expect(parsed.success ? undefined : parsed.error.issues).toBeUndefined();
    expect(SECTIONED_LOGS_DASHBOARD.pinned_panels).toHaveLength(3);
  });
});

describe('attached DISSECT results', () => {
  it('derives columns the index does not map and that clash with no mapped field', () => {
    for (const column of DISSECT_DERIVED_COLUMNS) {
      expect(SAMPLE_LOGS_MAPPED_FIELDS).not.toContain(column);
      expect(SAMPLE_LOGS_MAPPED_FIELDS).not.toContain(`${column}.keyword`);
    }
  });

  it('names every derived column in the query, the columns, and each sample row', () => {
    expect(DISSECT_LOGS_RESULTS.columns.map(({ name }) => name)).toEqual(DISSECT_DERIVED_COLUMNS);
    for (const column of DISSECT_DERIVED_COLUMNS) {
      expect(DISSECT_LOGS_RESULTS.query).toContain(`%{${column}}`);
    }
    for (const row of DISSECT_LOGS_RESULTS.sampleRows) {
      expect(Object.keys(row).sort()).toEqual([...DISSECT_DERIVED_COLUMNS].sort());
    }
    expect(DISSECT_LOGS_RESULTS.query).toContain('| DISSECT message ');
    expect(DISSECT_LOGS_RESULTS.totalHits).toBeGreaterThan(DISSECT_LOGS_RESULTS.sampleRows.length);
  });
});

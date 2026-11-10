/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getLeafPanels } from '../../../src/dashboard_panels';
import { TOP_LEVEL, type DashboardDatasetExample } from '../../../src/types';
import {
  DASHBOARD_CREATION_EXAMPLES,
  DASHBOARD_DISCOVER_RESULTS_EXAMPLES,
  DASHBOARD_EDIT_SCENARIO_EXAMPLES,
  DASHBOARD_ENHANCE_EXAMPLES,
  DASHBOARD_LAYOUT_EDIT_EXAMPLES,
  DASHBOARD_ROUTING_EXAMPLES,
} from '.';

const seedIds = (dashboard: DashboardAttachmentData): Set<string> =>
  new Set([
    TOP_LEVEL,
    ...dashboard.panels.filter(isSection).map(({ id }) => id),
    ...getLeafPanels(dashboard).map(({ id }) => id),
  ]);

/** Every seed panel or section id the gold names. */
const goldIds = ({ output }: DashboardDatasetExample): string[] => {
  const { layoutEdit, panelEdits = [], replaceConfirmation } = output ?? {};
  const placements = layoutEdit?.placements ?? [];
  return compact([
    ...(layoutEdit?.changes ?? []),
    ...(layoutEdit?.removed ?? []),
    ...placements.flatMap(({ item, in: container, beside, below, after, before }) => [
      typeof item === 'string' ? item : undefined,
      container,
      beside,
      below,
      after,
      before,
    ]),
    ...panelEdits.map(({ panel }) => (typeof panel === 'string' ? panel : undefined)),
    replaceConfirmation?.panel,
  ]);
};

const examples = [
  ...DASHBOARD_CREATION_EXAMPLES,
  ...DASHBOARD_DISCOVER_RESULTS_EXAMPLES,
  ...DASHBOARD_EDIT_SCENARIO_EXAMPLES,
  ...DASHBOARD_ENHANCE_EXAMPLES,
  ...DASHBOARD_LAYOUT_EDIT_EXAMPLES,
  ...DASHBOARD_ROUTING_EXAMPLES,
];

describe('dashboard dataset gold', () => {
  it.each(examples.map((example) => [example.input?.question, example] as const))(
    'names only ids of its seeded dashboard: %s',
    (_question, example) => {
      const ids = goldIds(example);
      const dashboard = example.input?.dashboard;
      if (!dashboard) {
        expect(ids).toEqual([]);
        return;
      }
      const known = seedIds(dashboard);
      expect(ids.filter((id) => !known.has(id))).toEqual([]);
    }
  );
});

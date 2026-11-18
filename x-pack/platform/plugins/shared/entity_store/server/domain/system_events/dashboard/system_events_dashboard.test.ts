/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import {
  SYSTEM_EVENTS_DASHBOARD_VERSION,
  buildSystemEventsDashboard,
} from './system_events_dashboard';

interface PanelJson {
  type: string;
  panelIndex: string;
  gridData: { sectionId?: string };
  embeddableConfig: {
    attributes?: { state: { query: { esql: string } } };
  };
}

const buildPanels = () => {
  const dashboard = buildSystemEventsDashboard('default');
  return {
    dashboard,
    panels: JSON.parse(dashboard.attributes.panelsJSON) as PanelJson[],
  };
};

describe('buildSystemEventsDashboard', () => {
  it('is a managed dashboard at the current version', () => {
    const { dashboard } = buildPanels();

    expect(dashboard.id).toBe('entity-store-system-events-default');
    expect(dashboard.managed).toBe(true);
    expect(dashboard.attributes.version).toBe(SYSTEM_EVENTS_DASHBOARD_VERSION);
  });

  it('puts the status strip first, outside any section, and keeps details collapsed', () => {
    const { dashboard, panels } = buildPanels();
    const strip = panels.filter(({ gridData }) => gridData.sectionId === undefined);

    expect(strip.map(({ panelIndex }) => panelIndex)).toEqual([
      'status-failing-tasks',
      'status-entities',
      'status-success-rate',
      'status-last-snapshot',
    ]);
    expect(dashboard.attributes.sections.map(({ title, collapsed }) => [title, collapsed])).toEqual(
      [
        ['Needs attention', false],
        ['Log extraction: last 3 days', false],
        ['Log extraction: 30-day trend', false],
        ['History snapshot and maintainers (30 days)', false],
        ['Details', true],
      ]
    );
  });

  it('has unique panel ids and every section id is used by a panel', () => {
    const { dashboard, panels } = buildPanels();
    const ids = panels.map(({ panelIndex }) => panelIndex);
    const usedSections = new Set(panels.map(({ gridData }) => gridData.sectionId));

    expect(new Set(ids).size).toBe(ids.length);
    dashboard.attributes.sections.forEach(({ gridData }) => {
      expect(usedSections.has(gridData.i)).toBe(true);
    });
  });

  it('targets the streams of the given space', () => {
    const { panels } = buildPanels();
    const queries = panels.flatMap(
      ({ embeddableConfig }) => embeddableConfig.attributes?.state.query.esql ?? []
    );

    expect(queries.join('\n')).toContain('.entities.v2.system.extraction_runs.default');
    expect(queries.join('\n')).toContain('.entities.v2.system.events.default');
  });

  it('only has valid ES|QL queries', async () => {
    const { panels } = buildPanels();
    const results = await Promise.all(
      panels.map(async ({ panelIndex, embeddableConfig }) => {
        const query = embeddableConfig.attributes?.state.query.esql;
        const errors = query
          ? (await validateQuery(query)).errors.map((error) =>
              'text' in error ? error.text : error.message
            )
          : [];
        return { panelIndex, errors };
      })
    );

    expect(results.filter(({ errors }) => errors.length > 0)).toEqual([]);
  });
});

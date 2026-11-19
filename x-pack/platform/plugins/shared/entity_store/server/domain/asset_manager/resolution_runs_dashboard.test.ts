/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getResolutionRuleMonitoringDashboard,
  getResolutionRuleMonitoringDashboardId,
  getResolutionRunsDataView,
  getResolutionRunsDataViewId,
} from './resolution_runs_dashboard';

describe('resolution rule monitoring dashboard', () => {
  const dashboard = getResolutionRuleMonitoringDashboard('default');
  const panels = JSON.parse(dashboard.attributes.panelsJSON) as Array<{
    panelIndex: string;
    embeddableConfig: { attributes: { visualizationType: string; references: unknown[] } };
  }>;

  it('puts the space id in the ids so every space has its own copy', () => {
    expect(getResolutionRuleMonitoringDashboardId('team-a')).toBe(
      'entity-store-resolution-rule-monitoring-team-a'
    );
    expect(getResolutionRunsDataViewId('team-a')).toBe(
      'entity-store-resolution-runs-data-view-team-a'
    );
  });

  it('is a managed dashboard with the three panels she chose: status, failures, declined groups', () => {
    expect(dashboard.managed).toBe(true);
    expect(panels).toHaveLength(4);
    expect(
      panels.map(({ embeddableConfig }) => embeddableConfig.attributes.visualizationType)
    ).toEqual(['lnsLegacyMetric', 'lnsLegacyMetric', 'lnsXY', 'lnsXY']);
  });

  it('points every panel at the data view of its space', () => {
    const dataViewId = getResolutionRunsDataViewId('default');
    expect(dashboard.references.every(({ id }) => id === dataViewId)).toBe(true);
    expect(dashboard.references).toHaveLength(panels.length);
    panels.forEach(({ panelIndex }) => {
      expect(dashboard.references.some(({ name }) => name.startsWith(`${panelIndex}:`))).toBe(true);
    });
  });

  it('has a data view on the run stream of its space, with a time field', () => {
    const dataView = getResolutionRunsDataView('team-a');
    expect(dataView.attributes.title).toBe('.entities.v2.resolution_runs.team-a');
    expect(dataView.attributes.timeFieldName).toBe('@timestamp');
    expect(dataView.managed).toBe(true);
  });

  it('shows the last 24 hours by default', () => {
    expect(dashboard.attributes.timeRestore).toBe(true);
    expect(dashboard.attributes.timeFrom).toBe('now-24h');
  });
});

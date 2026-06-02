/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import {
  buildOverviewDashboardPanels,
  transformOptionsIn,
  overviewDashboardId,
  syncAgentBuilderOverviewDashboard,
} from './install_dashboard';
import {
  AGENT_BUILDER_OVERVIEW_DASHBOARD_ID,
  AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION,
  AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER,
} from './constants';

const KIBANA_VERSION = '8.18.0';

// ---------------------------------------------------------------------------
// overviewDashboardId
// ---------------------------------------------------------------------------

describe('overviewDashboardId', () => {
  it('returns a stable id composed of the base constant and the space id', () => {
    expect(overviewDashboardId('default')).toBe(`${AGENT_BUILDER_OVERVIEW_DASHBOARD_ID}-default`);
    expect(overviewDashboardId('my-space')).toBe(`${AGENT_BUILDER_OVERVIEW_DASHBOARD_ID}-my-space`);
  });
});

// ---------------------------------------------------------------------------
// transformOptionsIn
// ---------------------------------------------------------------------------

describe('transformOptionsIn', () => {
  const logger = loggerMock.create();

  it('maps known API keys to saved-object camelCase equivalents', () => {
    const options = {
      hide_panel_titles: true,
      hide_panel_borders: false,
      use_margins: true,
      sync_colors: false,
      sync_tooltips: false,
      sync_cursor: true,
      auto_apply_filters: true,
    } as const;

    const result = JSON.parse(transformOptionsIn(options, logger));
    expect(result).toEqual({
      hidePanelTitles: true,
      hidePanelBorders: false,
      useMargins: true,
      syncColors: false,
      syncTooltips: false,
      syncCursor: true,
      autoApplyFilters: true,
    });
  });

  it('logs a warning for unknown option keys', () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    const options = {
      hide_panel_titles: false,
      unknown_future_key: 'value',
    } as unknown as Parameters<typeof transformOptionsIn>[0];

    transformOptionsIn(options, logger);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown_future_key'));
  });

  it('does not warn when all keys are known', () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    warnSpy.mockClear();
    const options = {
      hide_panel_titles: false,
      hide_panel_borders: false,
      use_margins: true,
      sync_colors: false,
      sync_tooltips: false,
      sync_cursor: true,
      auto_apply_filters: true,
    } as const;

    transformOptionsIn(options, logger);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// buildOverviewDashboardPanels
// ---------------------------------------------------------------------------

describe('buildOverviewDashboardPanels', () => {
  it('returns non-empty panels array', () => {
    const { panels } = buildOverviewDashboardPanels();
    expect(panels.length).toBeGreaterThan(0);
  });

  it('returns non-empty sections array', () => {
    const { sections } = buildOverviewDashboardPanels();
    expect(sections.length).toBeGreaterThan(0);
  });

  it('each panel has required saved-object fields', () => {
    const { panels } = buildOverviewDashboardPanels();
    for (const panel of panels) {
      expect(panel).toHaveProperty('type');
      expect(panel).toHaveProperty('panelIndex');
      expect(panel).toHaveProperty('gridData');
      expect(panel).toHaveProperty('embeddableConfig');
    }
  });

  it('each section has required saved-object fields', () => {
    const { sections } = buildOverviewDashboardPanels();
    for (const section of sections) {
      expect(section).toHaveProperty('title');
      expect(section).toHaveProperty('gridData');
    }
  });

  it('panels that belong to sections carry the correct sectionId', () => {
    const { panels, sections } = buildOverviewDashboardPanels();
    const sectionIds = new Set(sections.map((s) => s.gridData.i));
    const sectionedPanels = panels.filter((p) => p.gridData.sectionId !== undefined);
    for (const panel of sectionedPanels) {
      expect(sectionIds).toContain(panel.gridData.sectionId);
    }
  });
});

// ---------------------------------------------------------------------------
// syncAgentBuilderOverviewDashboard — version-check branching
// ---------------------------------------------------------------------------

describe('syncAgentBuilderOverviewDashboard', () => {
  const logger = loggerMock.create();

  const PER_PAGE = 100; // must match the constant in install_dashboard.ts

  function buildCoreStart(overrides: {
    spaceObjects?: Array<{ id: string }>;
    experimentalEnabled?: boolean;
    installedVersion?: number | null;
  }) {
    const { spaceObjects = [], experimentalEnabled = true, installedVersion = null } = overrides;

    const soClient = savedObjectsClientMock.create();

    soClient.get.mockImplementation(async (type, id) => {
      if (type === 'config') {
        if (!experimentalEnabled) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError('config', id);
        }
        return {
          id,
          type,
          references: [],
          attributes: {
            [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
          },
        } as ReturnType<typeof soClient.get> extends Promise<infer T> ? T : never;
      }

      if (type === 'dashboard') {
        if (installedVersion === null) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', id);
        }
        return {
          id,
          type,
          references: [],
          attributes: { version: installedVersion },
        } as ReturnType<typeof soClient.get> extends Promise<infer T> ? T : never;
      }

      throw new Error(`Unexpected SO type: ${type}`);
    });

    soClient.create.mockResolvedValue({} as any);
    soClient.delete.mockResolvedValue({} as any);

    const spaceRepo = savedObjectsClientMock.create();
    // Simulate paginated responses: each call returns the correct slice.
    spaceRepo.find.mockImplementation(async ({ page = 1 }: { page?: number } = {}) => {
      const start = (page - 1) * PER_PAGE;
      const batch = spaceObjects.slice(start, start + PER_PAGE).map((s) => ({
        id: s.id,
        type: 'space' as const,
        references: [] as never[],
        attributes: {},
        score: 0,
      }));
      return {
        saved_objects: batch,
        total: spaceObjects.length,
        per_page: PER_PAGE,
        page,
      };
    });

    const coreStart = {
      savedObjects: {
        createInternalRepository: jest.fn((types?: string[]) =>
          types?.includes('space') ? (spaceRepo as any) : (soClient as any)
        ),
      },
    };

    return { coreStart, soClient, spaceRepo };
  }

  it('installs the dashboard when experimental features are enabled and dashboard is absent', async () => {
    const { coreStart, soClient } = buildCoreStart({
      experimentalEnabled: true,
      installedVersion: null,
    });

    await syncAgentBuilderOverviewDashboard(coreStart as any, KIBANA_VERSION, logger);

    expect(soClient.create).toHaveBeenCalledWith(
      'dashboard',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('skips install when the dashboard is already at the current definition version', async () => {
    const { coreStart, soClient } = buildCoreStart({
      experimentalEnabled: true,
      installedVersion: AGENT_BUILDER_OVERVIEW_DASHBOARD_DEFINITION_VERSION,
    });

    await syncAgentBuilderOverviewDashboard(coreStart as any, KIBANA_VERSION, logger);

    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('removes the dashboard when experimental features are disabled', async () => {
    const { coreStart, soClient } = buildCoreStart({ experimentalEnabled: false });

    await syncAgentBuilderOverviewDashboard(coreStart as any, KIBANA_VERSION, logger);

    expect(soClient.delete).toHaveBeenCalledWith(
      'dashboard',
      expect.stringContaining('default'),
      expect.any(Object)
    );
    expect(soClient.create).not.toHaveBeenCalled();
  });

  it('fetches all spaces across multiple pages', async () => {
    // 250 spaces → 3 pages of 100, 100, 50
    const manySpaces = Array.from({ length: 250 }, (_, i) => ({ id: `space-${i}` }));
    const { coreStart, spaceRepo } = buildCoreStart({
      spaceObjects: manySpaces,
      experimentalEnabled: false, // skip install logic; we only care about the fetch
    });

    await syncAgentBuilderOverviewDashboard(coreStart as any, KIBANA_VERSION, logger);

    expect(spaceRepo.find).toHaveBeenCalledTimes(3);
    expect(spaceRepo.find).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1 }));
    expect(spaceRepo.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));
    expect(spaceRepo.find).toHaveBeenNthCalledWith(3, expect.objectContaining({ page: 3 }));
  });

  it('replaces the namespace placeholder in panelsJSON with the space id', async () => {
    const { coreStart, soClient } = buildCoreStart({
      experimentalEnabled: true,
      installedVersion: null,
    });

    await syncAgentBuilderOverviewDashboard(coreStart as any, KIBANA_VERSION, logger);

    const createCall = soClient.create.mock.calls[0];
    const dashboardAttributes = createCall[1] as Record<string, unknown>;
    expect(dashboardAttributes.panelsJSON).not.toContain(
      AGENT_BUILDER_TRACES_NAMESPACE_PLACEHOLDER
    );
  });
});

// ---------------------------------------------------------------------------
// isExperimentalFeaturesEnabledForSpace — version-strip regex
// ---------------------------------------------------------------------------

describe('version-strip regex (/-.*$/)', () => {
  const cases: Array<[string, string]> = [
    ['8.18.0', '8.18.0'],
    ['8.18.0-SNAPSHOT', '8.18.0'],
    ['9.0.0-alpha1', '9.0.0'],
    ['10.3.0-SNAPSHOT-20250601', '10.3.0'],
    ['8.18.0', '8.18.0'],
  ];

  it.each(cases)('strips pre-release suffix from "%s" → "%s"', (input, expected) => {
    expect(input.replace(/-.*$/, '')).toBe(expected);
  });
});

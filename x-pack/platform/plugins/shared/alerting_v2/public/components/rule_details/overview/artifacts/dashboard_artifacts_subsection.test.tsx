/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DASHBOARD_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { DashboardArtifactsSubsection } from './dashboard_artifacts_subsection';
import { SELECTABLE_LIST_MAX_HEIGHT } from './manage_dashboards_popover';
import { RuleProvider } from '../../rule_context';
import type { RuleApiResponse } from '../../../../services/rules_api';

const mockResolveDashboardsByIds = jest.fn();
const mockSearchRelatedDashboard = jest.fn();
const mockMapArtifacts = jest.fn(
  (artifacts: Array<{ id: string; type: string; data: Record<string, unknown> }> | undefined) =>
    artifacts?.length ? artifacts : undefined
);
const mockResolveArtifactId = jest.fn(
  (type: string, existingId?: string) => existingId?.trim() || `generated-${type}`
);

jest.mock('@kbn/alerting-v2-utils', () => ({
  ...jest.requireActual('@kbn/alerting-v2-utils'),
  resolveArtifactId: (type: string, existingId?: string) => mockResolveArtifactId(type, existingId),
}));

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  getDashboardId: (artifact: { data: Record<string, unknown> }) =>
    typeof artifact.data.dashboardId === 'string' ? artifact.data.dashboardId : undefined,
  resolveDashboardsByIds: (...args: unknown[]) => mockResolveDashboardsByIds(...args),
  searchRelatedDashboard: (...args: unknown[]) => mockSearchRelatedDashboard(...args),
  mapArtifacts: (artifacts: unknown) =>
    mockMapArtifacts(
      artifacts as Array<{ id: string; type: string; data: Record<string, unknown> }> | undefined
    ),
  partitionArtifactsByDashboardType: (
    artifacts: Array<{ id: string; type: string; data: Record<string, unknown> }>
  ) => ({
    dashboardArtifacts: artifacts.filter((artifact) => artifact.type === 'dashboard'),
    otherArtifacts: artifacts.filter((artifact) => artifact.type !== 'dashboard'),
  }),
}));

const mockUpdateRule = jest.fn();
const mockUseUpdateRule = jest.fn(() => ({
  mutate: mockUpdateRule,
  isLoading: false,
}));
jest.mock('../../../../hooks/use_update_rule', () => ({
  useUpdateRule: () => mockUseUpdateRule(),
}));

const mockDashboardService = { findDashboardsService: jest.fn() };
const mockShareService = {
  url: {
    locators: {
      get: jest.fn(() => ({
        getRedirectUrl: ({ dashboardId }: { dashboardId: string }) =>
          `/app/dashboards#/view/${dashboardId}`,
      })),
    },
  },
};
const mockHttpService = {
  basePath: {
    prepend: (path: string) => path,
  },
};

let mockDashboardServiceOverride: typeof mockDashboardService | undefined = mockDashboardService;
let mockCanWriteRules = true;

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown, options?: { optional?: boolean }) => {
    if (token === 'http') {
      return mockHttpService;
    }
    if (token === 'share') {
      return mockShareService;
    }
    if (token === 'dashboard') {
      if (mockDashboardServiceOverride === undefined && !options?.optional) {
        throw new Error('Required service "dashboard" is not bound');
      }
      return mockDashboardServiceOverride;
    }
    if (typeof token === 'function') {
      // UserCapabilities service token
      return {
        canWrite: (feature: string) => (feature === 'rules' ? mockCanWriteRules : true),
        canRead: () => true,
        can: () => mockCanWriteRules,
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => key,
}));

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  metadata: { name: 'Test Rule', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { format: 'composed' as const, base: 'FROM logs-*', breach: { segment: '' } },
  created_by: 'alice@example.com',
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: 'bob@example.com',
  updated_at: '2026-03-04T12:00:00.000Z',
};

const renderSubsection = (rule: RuleApiResponse) =>
  render(
    <I18nProvider>
      <RuleProvider rule={rule}>
        <DashboardArtifactsSubsection />
      </RuleProvider>
    </I18nProvider>
  );

describe('DashboardArtifactsSubsection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardServiceOverride = mockDashboardService;
    mockCanWriteRules = true;
    mockUseUpdateRule.mockReturnValue({
      mutate: mockUpdateRule,
      isLoading: false,
    });
    mockResolveDashboardsByIds.mockResolvedValue({ resolved: [], missing: [] });
    mockSearchRelatedDashboard.mockResolvedValue([]);
    mockMapArtifacts.mockImplementation(
      (artifacts: Array<{ id: string; type: string; data: Record<string, unknown> }> | undefined) =>
        artifacts?.length ? artifacts : undefined
    );
    mockResolveArtifactId.mockImplementation(
      (type: string, existingId?: string) => existingId?.trim() || `generated-${type}`
    );
  });

  it('renders empty state when the rule has no dashboard artifacts', async () => {
    renderSubsection(baseRule);

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardArtifactsEmpty')).toBeInTheDocument();
    });
    expect(screen.getByText('No dashboards linked')).toBeInTheDocument();
    expect(screen.getByTestId('ruleDashboardArtifactsEmptyAddButton')).toBeInTheDocument();
  });

  it('renders loading state while dashboards are being resolved', () => {
    mockResolveDashboardsByIds.mockReturnValue(new Promise(() => {}));

    renderSubsection({
      ...baseRule,
      artifacts: [
        { id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-1' } },
      ],
    });

    expect(screen.getByTestId('ruleDashboardArtifactsLoading')).toBeInTheDocument();
  });

  it('renders error state when dashboard resolution fails', async () => {
    mockResolveDashboardsByIds.mockRejectedValue(new Error('network error'));

    renderSubsection({
      ...baseRule,
      artifacts: [
        { id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-1' } },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardArtifactsError')).toBeInTheDocument();
    });
  });

  it('renders resolved dashboards with links', async () => {
    mockResolveDashboardsByIds.mockResolvedValue({
      resolved: [{ id: 'dash-1', title: 'Ops Dashboard' }],
      missing: [],
    });

    renderSubsection({
      ...baseRule,
      artifacts: [
        { id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-1' } },
      ],
    });

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardArtifactTitle-dash-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('ruleDashboardArtifactTitle-dash-1')).toHaveTextContent(
      'Ops Dashboard'
    );
    expect(screen.getByTestId('ruleDashboardArtifactOpenLink-dash-1')).toHaveAttribute(
      'href',
      '/app/dashboards#/view/dash-1'
    );
  });

  it('opens the manage popover when the add action is clicked', async () => {
    mockSearchRelatedDashboard.mockResolvedValue([{ id: 'dash-new', title: 'New Dashboard' }]);
    renderSubsection(baseRule);

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsAddButton'));

    expect(screen.getByTestId('ruleDashboardArtifactsManagePopover')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardArtifactsSelectable')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ruleDashboardArtifactsSearch')).toBeInTheDocument();
  });

  it('opens the manage popover from the empty-state CTA', async () => {
    renderSubsection(baseRule);

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardArtifactsEmptyAddButton')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsEmptyAddButton'));

    expect(screen.getByTestId('ruleDashboardArtifactsManagePopover')).toBeInTheDocument();
  });

  it('keeps a long dashboard list inside a scrollable container', async () => {
    mockSearchRelatedDashboard.mockResolvedValue(
      Array.from({ length: 40 }, (_, index) => {
        const id = String(index + 1).padStart(2, '0');
        return { id: `dash-${id}`, title: `Related Dashboard ${id}` };
      })
    );

    renderSubsection(baseRule);
    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsAddButton'));

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardSelectableOption-dash-40')).toBeInTheDocument();
    });

    const list = screen.getByTestId('ruleDashboardArtifactsSelectableList');
    expect(list).toContainElement(screen.getByTestId('ruleDashboardSelectableOption-dash-01'));
    expect(list).toContainElement(screen.getByTestId('ruleDashboardSelectableOption-dash-40'));
    expect(list).toHaveStyle({
      maxHeight: `${SELECTABLE_LIST_MAX_HEIGHT}px`,
      overflowY: 'auto',
    });
  });

  it('re-queries dashboards on the server when searching in the manage popover', async () => {
    mockSearchRelatedDashboard.mockImplementation(
      async (_dashboard: unknown, params: { search?: string } = {}) => {
        if (params.search?.includes('Zulu')) {
          return [{ id: 'dash-z', title: 'Zulu Far Away' }];
        }
        return [{ id: 'dash-a', title: 'Alpha' }];
      }
    );

    renderSubsection(baseRule);
    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsAddButton'));

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardSelectableOption-dash-a')).toBeInTheDocument();
    });
    expect(mockSearchRelatedDashboard).toHaveBeenCalledWith(mockDashboardService, {});

    fireEvent.change(screen.getByTestId('ruleDashboardArtifactsSearch'), {
      target: { value: 'Zulu' },
    });

    await waitFor(() => {
      expect(mockSearchRelatedDashboard).toHaveBeenCalledWith(mockDashboardService, {
        search: 'Zulu',
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardSelectableOption-dash-z')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('ruleDashboardSelectableOption-dash-a')).not.toBeInTheDocument();
  });

  it('saves selected dashboards via updateRule and preserves other artifacts', async () => {
    mockSearchRelatedDashboard.mockResolvedValue([{ id: 'dash-new', title: 'New Dashboard' }]);
    const rule = {
      ...baseRule,
      artifacts: [{ id: 'artifact-2', type: 'runbook', data: { content: 'runbook-content' } }],
    };

    renderSubsection(rule);

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsAddButton'));

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardSelectableOption-dash-new')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('ruleDashboardSelectableOption-dash-new'));
    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsManageSave'));

    expect(mockUpdateRule).toHaveBeenCalledWith(
      {
        id: 'rule-1',
        payload: {
          artifacts: [
            { id: 'artifact-2', type: 'runbook', data: { content: 'runbook-content' } },
            {
              id: 'generated-dashboard',
              type: DASHBOARD_ARTIFACT_TYPE,
              data: { dashboardId: 'dash-new' },
            },
          ],
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('removes a dashboard artifact after delete confirmation', async () => {
    mockResolveDashboardsByIds.mockResolvedValue({
      resolved: [{ id: 'dash-1', title: 'Ops Dashboard' }],
      missing: [],
    });

    const rule = {
      ...baseRule,
      artifacts: [
        { id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-1' } },
        { id: 'artifact-2', type: 'runbook', data: { content: 'runbook-content' } },
      ],
    };

    renderSubsection(rule);

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardArtifactDeleteButton-dash-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactDeleteButton-dash-1'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mockUpdateRule).toHaveBeenCalledWith(
      {
        id: 'rule-1',
        payload: {
          artifacts: [{ id: 'artifact-2', type: 'runbook', data: { content: 'runbook-content' } }],
        },
      },
      expect.objectContaining({ onSettled: expect.any(Function) })
    );
  });

  it('renders missing dashboard rows and allows removing them', async () => {
    mockResolveDashboardsByIds.mockResolvedValue({
      resolved: [],
      missing: [{ id: 'dash-missing', notFound: true }],
    });

    const rule = {
      ...baseRule,
      artifacts: [
        {
          id: 'artifact-missing',
          type: DASHBOARD_ARTIFACT_TYPE,
          data: { dashboardId: 'dash-missing' },
        },
      ],
    };

    renderSubsection(rule);

    await waitFor(() => {
      expect(
        screen.getByTestId('ruleDashboardArtifactMissingRow-dash-missing')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Dashboard deleted')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByTestId('ruleDashboardArtifactDeleteButton-dash-missing')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactDeleteButton-dash-missing'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mockUpdateRule).toHaveBeenCalledWith(
      {
        id: 'rule-1',
        payload: { artifacts: [] },
      },
      expect.objectContaining({ onSettled: expect.any(Function) })
    );
  });

  describe('when the user only has read privilege', () => {
    beforeEach(() => {
      mockCanWriteRules = false;
    });

    it('hides the add dashboards affordance and empty CTA', async () => {
      renderSubsection(baseRule);

      expect(screen.queryByTestId('ruleDashboardArtifactsAddButton')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('ruleDashboardArtifactsEmpty')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('ruleDashboardArtifactsEmptyAddButton')).not.toBeInTheDocument();
    });

    it('hides the remove (trash) affordance on resolved dashboard rows', async () => {
      mockResolveDashboardsByIds.mockResolvedValue({
        resolved: [{ id: 'dash-1', title: 'Ops Dashboard' }],
        missing: [],
      });

      renderSubsection({
        ...baseRule,
        artifacts: [
          { id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, data: { dashboardId: 'dash-1' } },
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId('ruleDashboardArtifactTitle-dash-1')).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId('ruleDashboardArtifactDeleteButton-dash-1')
      ).not.toBeInTheDocument();
      // The read-only open link remains available.
      expect(screen.getByTestId('ruleDashboardArtifactOpenLink-dash-1')).toBeInTheDocument();
    });
  });

  it('renders a subdued note when the dashboard plugin is unavailable', () => {
    mockDashboardServiceOverride = undefined;
    renderSubsection(baseRule);

    expect(screen.getByTestId('ruleDashboardArtifactsUnavailable')).toBeInTheDocument();
    expect(screen.getByText('Dashboards are unavailable in this environment.')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleDashboardArtifactsAddButton')).not.toBeInTheDocument();
  });
});

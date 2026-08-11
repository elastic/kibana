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
import { RuleProvider } from '../../rule_context';
import type { RuleApiResponse } from '../../../../services/rules_api';

const mockResolveDashboardsByIds = jest.fn();
const mockMapArtifacts = jest.fn(
  (artifacts: Array<{ id: string; type: string; value: string }> | undefined) =>
    (artifacts ?? []).map((artifact) => ({
      ...artifact,
      id: artifact.id.trim() ? artifact.id : `generated-${artifact.value}`,
    }))
);

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  resolveDashboardsByIds: (...args: unknown[]) => mockResolveDashboardsByIds(...args),
  mapArtifacts: (artifacts: unknown) =>
    mockMapArtifacts(artifacts as Array<{ id: string; type: string; value: string }> | undefined),
  buildDashboardArtifactsFromSelection: ({
    selectedOptions,
    currentArtifacts,
    missingDashboards,
  }: {
    selectedOptions: Array<{ label: string; value: string }>;
    currentArtifacts: Array<{ id: string; type: string; value: string }>;
    missingDashboards: Array<{ id: string }>;
  }) => {
    const missingIds = new Set(missingDashboards.map((entry) => entry.id));
    const preservedMissingArtifacts = currentArtifacts.filter((artifact) =>
      missingIds.has(artifact.value)
    );
    const selectedArtifacts = selectedOptions.flatMap((selectedOption) => {
      const dashboardId = selectedOption.value;
      if (!dashboardId) {
        return [];
      }
      const existingArtifact = currentArtifacts.find((artifact) => artifact.value === dashboardId);
      return [
        {
          id: existingArtifact?.id ?? '',
          type: 'dashboard',
          value: dashboardId,
        },
      ];
    });
    return [...selectedArtifacts, ...preservedMissingArtifacts];
  },
  partitionArtifactsByDashboardType: (
    artifacts: Array<{ id: string; type: string; value: string }>
  ) => ({
    dashboardArtifacts: artifacts.filter((artifact) => artifact.type === 'dashboard'),
    otherArtifacts: artifacts.filter((artifact) => artifact.type !== 'dashboard'),
  }),
  MissingDashboardsCallout: () => null,
  RelatedDashboardsComboBox: ({
    onChange,
    dashboardsFormData,
  }: {
    onChange: (selected: Array<{ label: string; value: string }>) => void;
    dashboardsFormData: Array<{ id: string }>;
  }) => (
    <button
      type="button"
      data-test-subj="dashboardsSelector"
      onClick={() =>
        onChange([
          ...dashboardsFormData.map((entry) => ({ label: entry.id, value: entry.id })),
          { label: 'New Dashboard', value: 'dash-new' },
        ])
      }
    >
      Mock dashboards selector
    </button>
  ),
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
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T12:00:00.000Z',
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
    mockMapArtifacts.mockImplementation(
      (artifacts: Array<{ id: string; type: string; value: string }> | undefined) =>
        (artifacts ?? []).map((artifact) => ({
          ...artifact,
          id: artifact.id.trim() ? artifact.id : `generated-${artifact.value}`,
        }))
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
      artifacts: [{ id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-1' }],
    });

    expect(screen.getByTestId('ruleDashboardArtifactsLoading')).toBeInTheDocument();
  });

  it('renders error state when dashboard resolution fails', async () => {
    mockResolveDashboardsByIds.mockRejectedValue(new Error('network error'));

    renderSubsection({
      ...baseRule,
      artifacts: [{ id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-1' }],
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
      artifacts: [{ id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-1' }],
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
    renderSubsection(baseRule);

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsAddButton'));

    expect(screen.getByTestId('ruleDashboardArtifactsManagePopover')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardsSelector')).toBeInTheDocument();
  });

  it('opens the manage popover from the empty-state CTA', async () => {
    renderSubsection(baseRule);

    await waitFor(() => {
      expect(screen.getByTestId('ruleDashboardArtifactsEmptyAddButton')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsEmptyAddButton'));

    expect(screen.getByTestId('ruleDashboardArtifactsManagePopover')).toBeInTheDocument();
  });

  it('saves selected dashboards via updateRule and preserves other artifacts', async () => {
    const rule = {
      ...baseRule,
      artifacts: [{ id: 'artifact-2', type: 'runbook', value: 'runbook-content' }],
    };

    renderSubsection(rule);

    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsAddButton'));
    fireEvent.click(screen.getByTestId('dashboardsSelector'));
    fireEvent.click(screen.getByTestId('ruleDashboardArtifactsManageSave'));

    expect(mockUpdateRule).toHaveBeenCalledWith(
      {
        id: 'rule-1',
        payload: {
          artifacts: [
            { id: 'artifact-2', type: 'runbook', value: 'runbook-content' },
            {
              id: 'generated-dash-new',
              type: DASHBOARD_ARTIFACT_TYPE,
              value: 'dash-new',
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
        { id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-1' },
        { id: 'artifact-2', type: 'runbook', value: 'runbook-content' },
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
          artifacts: [{ id: 'artifact-2', type: 'runbook', value: 'runbook-content' }],
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
      artifacts: [{ id: 'artifact-missing', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-missing' }],
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
        artifacts: [{ id: 'artifact-1', type: DASHBOARD_ARTIFACT_TYPE, value: 'dash-1' }],
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { PROJECT_ROUTING } from '@kbn/cps-utils';

import * as appDependencies from '../../../app_dependencies';

import { getTransformConfigMock } from '../state_management/__mocks__/transform_config';
import { EditTransformFlyoutProvider } from '../state_management/edit_transform_flyout_state';

import { EditTransformProjectScope } from './edit_transform_project_scope';

const mockUseGetTransformCpsEnabled = jest.fn(
  (_args?: { enabled: boolean }) => ({ data: true } as { data: boolean | undefined })
);

jest.mock('../../../app_dependencies');
jest.mock('../../../hooks/use_get_transform_cps_enabled', () => ({
  useGetTransformCpsEnabled: (args: { enabled: boolean }) => mockUseGetTransformCpsEnabled(args),
}));

const originProject = {
  _id: 'origin-id',
  _alias: 'local_project',
  _organisation: 'org',
  _type: 'security',
};

const linkedSecurityProject = {
  _id: 'linked-security-id',
  _alias: 'linked_security_project',
  _organisation: 'org',
  _type: 'security',
};

const linkedObservabilityProject = {
  _id: 'linked-observability-id',
  _alias: 'linked_observability_project',
  _organisation: 'org',
  _type: 'observability',
};

const renderProjectScope = (projectRouting?: string) => {
  const onOpenProjectScope = jest.fn();
  const config = {
    ...getTransformConfigMock(),
    source: {
      ...getTransformConfigMock().source,
      ...(projectRouting ? { project_routing: projectRouting } : {}),
    },
  };

  renderWithI18n(
    <EditTransformFlyoutProvider config={config}>
      <EditTransformProjectScope onOpenProjectScope={onOpenProjectScope} />
    </EditTransformFlyoutProvider>
  );
  return { onOpenProjectScope };
};

describe('EditTransformProjectScope', () => {
  beforeEach(() => {
    mockUseGetTransformCpsEnabled.mockReturnValue({ data: true });
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        fetchProjects: jest.fn(async (routing?: string) => {
          if (routing === PROJECT_ROUTING.ALL) {
            return {
              origin: originProject,
              linkedProjects: [linkedSecurityProject, linkedObservabilityProject],
            };
          }

          if (routing === '_type:security' || routing === '@security-projects') {
            return {
              origin: originProject,
              linkedProjects: [linkedSecurityProject],
            };
          }

          return {
            origin: originProject,
            linkedProjects: [],
          };
        }),
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;
  });

  it('does not render outside CPS-eligible tiers', () => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = { isTierEligible: false } as any;

    renderProjectScope();

    expect(screen.queryByTestId('transformEditProjectScopeButton')).not.toBeInTheDocument();
  });

  it('does not render when the Elasticsearch cross-project feature flags are disabled', () => {
    mockUseGetTransformCpsEnabled.mockReturnValue({ data: false });

    renderProjectScope();

    expect(screen.queryByTestId('transformEditProjectScopeButton')).not.toBeInTheDocument();
    expect(
      appDependencies.useAppDependencies().cps?.cpsManager?.fetchProjects
    ).not.toHaveBeenCalled();
  });

  it('uses origin routing for display and opens the project scope flyout', async () => {
    const { onOpenProjectScope } = renderProjectScope();

    await waitFor(() => {
      expect(screen.getByTestId('transformEditProjectScopeButton')).toHaveTextContent(
        'This project'
      );
    });

    fireEvent.click(screen.getByTestId('transformEditProjectScopeButton'));

    expect(onOpenProjectScope).toHaveBeenCalledTimes(1);
  });

  it('surfaces project fetch failures on the project scope button and does not open the flyout', async () => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        fetchProjects: jest.fn().mockRejectedValue(new Error('Project fetch failed')),
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;
    const { onOpenProjectScope } = renderProjectScope();

    await waitFor(() => {
      expect(screen.getByTestId('transformEditProjectScopeButton')).toHaveTextContent(
        'Project scope unavailable'
      );
    });

    expect(screen.getAllByText('Project scope unavailable')).toHaveLength(2);
    expect(screen.getByTestId('transformEditProjectScopeButton')).toBeDisabled();

    fireEvent.click(screen.getByTestId('transformEditProjectScopeButton'));

    expect(onOpenProjectScope).not.toHaveBeenCalled();
  });

  it('counts projects from route-scoped fetches for filtered routing', async () => {
    renderProjectScope('_type:security');

    await waitFor(() => {
      expect(screen.getByTestId('transformEditProjectScopeButton')).toHaveTextContent(
        '2/3 projects'
      );
    });

    expect(
      appDependencies.useAppDependencies().cps?.cpsManager?.fetchProjects
    ).toHaveBeenCalledWith('_type:security');
  });

  it('counts projects from route-scoped fetches for named routing', async () => {
    renderProjectScope('@security-projects');

    await waitFor(() => {
      expect(screen.getByTestId('transformEditProjectScopeButton')).toHaveTextContent(
        '2/3 projects'
      );
    });

    expect(
      appDependencies.useAppDependencies().cps?.cpsManager?.fetchProjects
    ).toHaveBeenCalledWith('@security-projects');
  });
});

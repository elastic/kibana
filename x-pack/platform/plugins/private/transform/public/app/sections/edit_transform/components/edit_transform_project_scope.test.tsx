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

jest.mock('../../../app_dependencies');

const renderProjectScope = () => {
  const onOpenProjectScope = jest.fn();
  renderWithI18n(
    <EditTransformFlyoutProvider config={getTransformConfigMock()}>
      <EditTransformProjectScope onOpenProjectScope={onOpenProjectScope} />
    </EditTransformFlyoutProvider>
  );
  return { onOpenProjectScope };
};

describe('EditTransformProjectScope', () => {
  beforeEach(() => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        fetchProjects: jest.fn().mockResolvedValue({
          origin: {
            _id: 'origin-id',
            _alias: 'local_project',
            _organisation: 'org',
            _type: 'security',
          },
          linkedProjects: [
            {
              _id: 'linked-id',
              _alias: 'linked_project',
              _organisation: 'org',
              _type: 'security',
            },
          ],
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
});

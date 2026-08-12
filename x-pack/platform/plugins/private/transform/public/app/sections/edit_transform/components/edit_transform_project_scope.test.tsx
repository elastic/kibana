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

jest.mock('../../create_transform/components/wizard/project_scope_selector', () => ({
  ProjectScopeSelector: (props: {
    onProjectRoutingChange: (projectRouting: string) => void;
    projectRouting?: string;
  }) => (
    <button
      type="button"
      data-test-subj="mockProjectScopeSelector"
      onClick={() => props.onProjectRoutingChange('_id:linked-id')}
    >
      {props.projectRouting}
    </button>
  ),
}));

const renderProjectScope = () =>
  renderWithI18n(
    <EditTransformFlyoutProvider config={getTransformConfigMock()}>
      <EditTransformProjectScope />
    </EditTransformFlyoutProvider>
  );

describe('EditTransformProjectScope', () => {
  beforeEach(() => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;
  });

  it('does not render outside CPS-eligible tiers', () => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = { isTierEligible: false } as any;

    renderProjectScope();

    expect(screen.queryByTestId('mockProjectScopeSelector')).not.toBeInTheDocument();
  });

  it('uses origin routing for display without writing a default value', async () => {
    renderProjectScope();

    expect(screen.getByTestId('mockProjectScopeSelector')).toHaveTextContent(
      PROJECT_ROUTING.ORIGIN
    );

    fireEvent.click(screen.getByTestId('mockProjectScopeSelector'));

    await waitFor(() => {
      expect(screen.getByTestId('mockProjectScopeSelector')).toHaveTextContent('_id:linked-id');
    });
  });
});

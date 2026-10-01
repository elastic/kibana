/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { PROJECT_ROUTING } from '@kbn/cps-utils';

import * as appDependencies from '../../../app_dependencies';

import { getTransformConfigMock } from '../state_management/__mocks__/transform_config';
import { EditTransformFlyoutProvider } from '../state_management/edit_transform_flyout_state';
import { useFormField } from '../state_management/selectors/form_field';

import { EditTransformProjectScopeFlyout } from './edit_transform_project_scope_flyout';

jest.mock('../../../app_dependencies');

class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
}

const originProject = {
  _id: 'p1',
  _alias: 'local_project',
  _organisation: 'org',
  _type: 'security',
};

const linkedProject = {
  _id: 'p2',
  _alias: 'linked_project',
  _organisation: 'org',
  _type: 'security',
};

const ProjectRoutingProbe = () => {
  const { value } = useFormField('projectRouting');
  return (
    <div data-project-routing={value} data-test-subj="projectRoutingProbe">
      {value}
    </div>
  );
};

const renderFlyout = (projectRouting: string) => {
  const onClose = jest.fn();
  const config = {
    ...getTransformConfigMock(),
    source: {
      ...getTransformConfigMock().source,
      project_routing: projectRouting,
    },
  };

  renderWithI18n(
    <EditTransformFlyoutProvider config={config}>
      <ProjectRoutingProbe />
      <EditTransformProjectScopeFlyout
        onClose={onClose}
        projects={{ originProject, linkedProjects: [linkedProject] }}
      />
    </EditTransformFlyoutProvider>
  );

  return { onClose };
};

describe('EditTransformProjectScopeFlyout', () => {
  beforeEach(() => {
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps = {
      isTierEligible: true,
      cpsManager: {
        fetchProjects: jest.fn().mockResolvedValue({
          origin: originProject,
          linkedProjects: [linkedProject],
        }),
        getDefaultProjectRouting: jest.fn(() => PROJECT_ROUTING.ALL),
      },
    } as any;
  });

  it('does not rewrite an exact-all-ID snapshot to all projects when applying without edits', async () => {
    const exactAllIdsSnapshot = '_id:p1 AND _id:p2';
    const { onClose } = renderFlyout(exactAllIdsSnapshot);

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('projectRoutingProbe')).toHaveTextContent(exactAllIdsSnapshot);
    expect(screen.getByTestId('projectRoutingProbe')).not.toHaveTextContent(PROJECT_ROUTING.ALL);
  });

  it('does not rewrite a named project routing reference when applying without edits', async () => {
    const namedRouting = '@my-named-routing';
    const { onClose } = renderFlyout(namedRouting);

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('projectRoutingProbe')).toHaveTextContent(namedRouting);
    expect(screen.getByTestId('projectRoutingProbe')).not.toHaveTextContent(PROJECT_ROUTING.ALL);
  });

  it('does not write origin routing when applying without edits for unset project routing', async () => {
    const { onClose } = renderFlyout('');

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('projectRoutingProbe')).toHaveAttribute('data-project-routing', '');
  });

  it('reverts to the default project routing verbatim', async () => {
    const appDeps = appDependencies.useAppDependencies();
    appDeps.cps!.cpsManager!.getDefaultProjectRouting = jest.fn(() => PROJECT_ROUTING.ORIGIN);
    renderFlyout('_id:p2');

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p2')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
    expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.queryByText('Using space defaults')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('projectPickerGlobalActionsButton'));
    await userEvent.click(screen.getByText('Revert to space defaults'));

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerFlyoutApplyButton')).toBeEnabled();
    });

    await userEvent.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(screen.getByTestId('projectRoutingProbe')).toHaveTextContent(PROJECT_ROUTING.ORIGIN);
    expect(screen.getByTestId('projectRoutingProbe')).not.toHaveTextContent(PROJECT_ROUTING.ALL);
    expect(screen.getByTestId('projectRoutingProbe')).not.toHaveTextContent('_id:p1');
  });
});

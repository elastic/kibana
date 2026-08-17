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
  return <div data-test-subj="projectRoutingProbe">{value}</div>;
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
      <EditTransformProjectScopeFlyout onClose={onClose} />
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

    fireEvent.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('projectRoutingProbe')).toHaveTextContent(exactAllIdsSnapshot);
    expect(screen.getByTestId('projectRoutingProbe')).not.toHaveTextContent(PROJECT_ROUTING.ALL);
  });

  it('does not rewrite a named project routing reference when applying without edits', async () => {
    const namedRouting = '@my-named-routing';
    const { onClose } = renderFlyout(namedRouting);

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('projectPickerFlyoutApplyButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('projectRoutingProbe')).toHaveTextContent(namedRouting);
    expect(screen.getByTestId('projectRoutingProbe')).not.toHaveTextContent(PROJECT_ROUTING.ALL);
  });
});

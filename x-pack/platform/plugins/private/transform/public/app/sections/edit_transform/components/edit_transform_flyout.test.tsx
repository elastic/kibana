/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { EditAction } from '../../transform_management/components/action_edit';

import { getTransformConfigMock } from '../state_management/__mocks__/transform_config';

import { EditTransformFlyout } from './edit_transform_flyout';

jest.mock('../state_management/edit_transform_flyout_state', () => ({
  EditTransformFlyoutProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('./edit_transform_flyout_form', () => ({
  EditTransformFlyoutForm: ({
    onOpenProjectScope,
  }: {
    onOpenProjectScope: (projects: { originProject: null; linkedProjects: [] }) => void;
  }) => (
    <button
      data-test-subj="openProjectScopeButton"
      onClick={() => onOpenProjectScope({ originProject: null, linkedProjects: [] })}
    >
      Open project scope
    </button>
  ),
}));

jest.mock('./edit_transform_project_scope_flyout', () => ({
  EditTransformProjectScopeFlyout: () => (
    <div data-test-subj="transformEditProjectScopeFlyout">Project scope flyout</div>
  ),
}));

jest.mock('./edit_transform_api_error_callout', () => ({
  EditTransformApiErrorCallout: () => null,
}));

jest.mock('./edit_transform_flyout_callout', () => ({
  EditTransformFlyoutCallout: () => null,
}));

jest.mock('./edit_transform_update_button', () => ({
  EditTransformUpdateButton: () => (
    <button data-test-subj="editTransformUpdateButton">Update</button>
  ),
}));

jest.mock(
  '../../transform_management/components/managed_transforms_callout/managed_transforms_callout',
  () => ({
    ManagedTransformsWarningCallout: () => null,
  })
);

describe('EditTransformFlyout', () => {
  const defaultProps = {
    action: {} as EditAction['action'],
    closeFlyout: jest.fn(),
    config: getTransformConfigMock(),
    dataViewId: 'data-view-id',
    isFlyoutVisible: true,
  };

  it('opens on the main edit view after being closed from the project scope view', async () => {
    const { rerender } = renderWithI18n(<EditTransformFlyout {...defaultProps} />);

    fireEvent.click(screen.getByTestId('openProjectScopeButton'));

    expect(screen.getByTestId('transformEditProjectScopeFlyout')).toBeInTheDocument();

    rerender(<EditTransformFlyout {...defaultProps} isFlyoutVisible={false} />);
    rerender(<EditTransformFlyout {...defaultProps} isFlyoutVisible={true} />);

    await waitFor(() => {
      expect(screen.queryByTestId('transformEditProjectScopeFlyout')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('openProjectScopeButton')).toBeInTheDocument();
  });
});

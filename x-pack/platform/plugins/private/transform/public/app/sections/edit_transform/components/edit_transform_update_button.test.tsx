/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { useAppDependencies, useToastNotifications } from '../../../app_dependencies';
import { useToastNotificationText } from '../../../components';
import { useGetTransformsPreview, useUpdateTransform } from '../../../hooks';

import { getTransformConfigMock } from '../state_management/__mocks__/transform_config';
import { EditTransformFlyoutProvider } from '../state_management/edit_transform_flyout_state';

import { EditTransformRetentionPolicy } from './edit_transform_retention_policy';
import { EditTransformUpdateButton } from './edit_transform_update_button';

const mockUpdateTransform = jest.fn();

jest.mock('../../../app_dependencies', () => ({
  useAppDependencies: jest.fn(),
  useToastNotifications: jest.fn(),
}));
jest.mock('../../../components', () => ({
  useToastNotificationText: jest.fn(),
}));
jest.mock('../../../hooks', () => ({
  useGetTransformsPreview: jest.fn(),
  useUpdateTransform: jest.fn(),
}));

describe('EditTransformUpdateButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAppDependencies).mockReturnValue({} as ReturnType<typeof useAppDependencies>);
    jest.mocked(useToastNotifications).mockReturnValue({
      addDanger: jest.fn(),
    } as unknown as ReturnType<typeof useToastNotifications>);
    jest
      .mocked(useToastNotificationText)
      .mockReturnValue(jest.fn() as ReturnType<typeof useToastNotificationText>);
    jest.mocked(useGetTransformsPreview).mockReturnValue({
      data: {
        generated_dest_index: {
          mappings: {
            properties: {
              timestamp: { type: 'date' },
            },
          },
        },
      },
      error: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformsPreview>);
    jest.mocked(useUpdateTransform).mockReturnValue(mockUpdateTransform);
  });

  it('validates retention fields on submit before updating the transform', async () => {
    const config = getTransformConfigMock();

    renderWithI18n(
      <EditTransformFlyoutProvider config={config} dataViewId="data-view-id">
        <EditTransformRetentionPolicy />
        <EditTransformUpdateButton closeFlyout={jest.fn()} />
      </EditTransformFlyoutProvider>
    );

    fireEvent.click(screen.getByTestId('transformEditRetentionPolicySwitch'));

    const saveButton = screen.getByTestId('transformEditFlyoutUpdateButton');
    expect(saveButton).toBeEnabled();
    expect(screen.queryByText('Required field.')).not.toBeInTheDocument();

    fireEvent.click(saveButton);

    expect(await screen.findByText('Required field.')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
    expect(mockUpdateTransform).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('transformEditFlyoutRetentionPolicyFieldSelect'), {
      target: { value: 'timestamp' },
    });
    fireEvent.change(screen.getByTestId('transformEditFlyoutRetentionPolicyMaxAgeInput'), {
      target: { value: '1' },
    });

    await waitFor(() => expect(saveButton).toBeEnabled());
    expect(useUpdateTransform).toHaveBeenLastCalledWith(
      config.id,
      expect.objectContaining({
        retention_policy: {
          time: {
            field: 'timestamp',
            max_age: '1d',
          },
        },
      })
    );

    fireEvent.click(saveButton);

    expect(mockUpdateTransform).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      })
    );
  });
});

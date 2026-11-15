/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { useAppDependencies, useToastNotifications } from '../../../app_dependencies';
import { useToastNotificationText } from '../../../components';
import { useGetTransformsPreview } from '../../../hooks';
import {
  useEditTransformFlyoutActions,
  useEditTransformFlyoutContext,
} from '../state_management/edit_transform_flyout_state';
import { getTransformConfigMock } from '../state_management/__mocks__/transform_config';
import { getDefaultState } from '../state_management/get_default_state';
import { useFormField } from '../state_management/selectors/form_field';
import { useFormSections } from '../state_management/selectors/form_sections';
import { useHasAttemptedSubmit } from '../state_management/selectors/has_attempted_submit';
import { useRetentionPolicyField } from '../state_management/selectors/retention_policy_field';
import { EditTransformRetentionPolicy } from './edit_transform_retention_policy';

jest.mock('../../../app_dependencies', () => ({
  useAppDependencies: jest.fn(),
  useToastNotifications: jest.fn(),
}));
jest.mock('../../../components', () => ({
  useToastNotificationText: jest.fn(),
}));
jest.mock('../../../hooks', () => ({
  useGetTransformsPreview: jest.fn(),
}));
jest.mock('../state_management/edit_transform_flyout_state', () => ({
  useEditTransformFlyoutActions: jest.fn(),
  useEditTransformFlyoutContext: jest.fn(),
}));
jest.mock('../state_management/selectors/form_sections', () => ({
  useFormSections: jest.fn(),
}));
jest.mock('../state_management/selectors/form_field', () => ({
  useFormField: jest.fn(),
}));
jest.mock('../state_management/selectors/has_attempted_submit', () => ({
  useHasAttemptedSubmit: jest.fn(),
}));
jest.mock('../state_management/selectors/retention_policy_field', () => ({
  useRetentionPolicyField: jest.fn(),
}));

describe('EditTransformRetentionPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const transformConfig = getTransformConfigMock();
    const defaultState = getDefaultState(transformConfig);
    jest.mocked(useAppDependencies).mockReturnValue({} as ReturnType<typeof useAppDependencies>);
    jest.mocked(useToastNotifications).mockReturnValue({
      addDanger: jest.fn(),
    } as unknown as ReturnType<typeof useToastNotifications>);
    jest
      .mocked(useToastNotificationText)
      .mockReturnValue(jest.fn() as ReturnType<typeof useToastNotificationText>);
    jest.mocked(useEditTransformFlyoutContext).mockReturnValue({
      config: transformConfig,
      dataViewId: 'data-view-id',
    });
    jest.mocked(useEditTransformFlyoutActions).mockReturnValue({
      setFormField: jest.fn(),
      setFormSection: jest.fn(),
    } as unknown as ReturnType<typeof useEditTransformFlyoutActions>);
    jest.mocked(useFormField).mockImplementation((field) => defaultState.formFields[field]);
    jest.mocked(useFormSections).mockReturnValue(defaultState.formSections);
    jest.mocked(useHasAttemptedSubmit).mockReturnValue(false);
    jest
      .mocked(useRetentionPolicyField)
      .mockReturnValue(defaultState.formFields.retentionPolicyField);
  });

  it('shows the retention policy checkbox when a destination time field is available', () => {
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
    } as unknown as ReturnType<typeof useGetTransformsPreview>);

    renderWithI18n(<EditTransformRetentionPolicy />);

    expect(screen.getByTestId('transformEditRetentionPolicySwitch')).toHaveAttribute(
      'type',
      'checkbox'
    );
  });

  it('hides the retention policy checkbox when no destination time field is available', () => {
    jest.mocked(useGetTransformsPreview).mockReturnValue({
      data: {
        generated_dest_index: {
          mappings: {
            properties: {
              category: { type: 'keyword' },
            },
          },
        },
      },
      error: null,
    } as unknown as ReturnType<typeof useGetTransformsPreview>);

    renderWithI18n(<EditTransformRetentionPolicy />);

    expect(screen.queryByTestId('transformEditRetentionPolicySwitch')).not.toBeInTheDocument();
  });

  it('shows an existing retention policy while the preview is loading', () => {
    const transformConfig = {
      ...getTransformConfigMock(),
      retention_policy: {
        time: {
          field: 'timestamp',
          max_age: '1d',
        },
      },
    };
    const defaultState = getDefaultState(transformConfig);
    jest.mocked(useEditTransformFlyoutContext).mockReturnValue({
      config: transformConfig,
      dataViewId: 'data-view-id',
    });
    jest.mocked(useFormField).mockImplementation((field) => defaultState.formFields[field]);
    jest.mocked(useFormSections).mockReturnValue(defaultState.formSections);
    jest
      .mocked(useRetentionPolicyField)
      .mockReturnValue(defaultState.formFields.retentionPolicyField);
    jest.mocked(useGetTransformsPreview).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as unknown as ReturnType<typeof useGetTransformsPreview>);

    renderWithI18n(<EditTransformRetentionPolicy />);

    expect(screen.getByTestId('transformEditRetentionPolicySwitch')).toBeChecked();
    expect(screen.getByTestId('transformEditFlyoutRetentionPolicyFieldInput')).toHaveValue(
      'timestamp'
    );
    expect(screen.getByTestId('transformEditFlyoutRetentionPolicyMaxAgeInput')).toHaveValue(1);
    expect(screen.getByTestId('transformEditFlyoutRetentionPolicyMaxAgeUnitSelect')).toHaveValue(
      'd'
    );
  });

  it('shows an existing retention policy when the preview request fails', () => {
    const transformConfig = {
      ...getTransformConfigMock(),
      retention_policy: {
        time: {
          field: 'timestamp',
          max_age: '1d',
        },
      },
    };
    const defaultState = getDefaultState(transformConfig);
    jest.mocked(useEditTransformFlyoutContext).mockReturnValue({
      config: transformConfig,
      dataViewId: 'data-view-id',
    });
    jest.mocked(useFormField).mockImplementation((field) => defaultState.formFields[field]);
    jest.mocked(useFormSections).mockReturnValue(defaultState.formSections);
    jest
      .mocked(useRetentionPolicyField)
      .mockReturnValue(defaultState.formFields.retentionPolicyField);
    jest.mocked(useGetTransformsPreview).mockReturnValue({
      data: undefined,
      error: new Error('Preview failed'),
      isLoading: false,
    } as unknown as ReturnType<typeof useGetTransformsPreview>);

    renderWithI18n(<EditTransformRetentionPolicy />);

    expect(screen.getByTestId('transformEditRetentionPolicySwitch')).toBeChecked();
    expect(screen.getByTestId('transformEditFlyoutRetentionPolicyFieldInput')).toHaveValue(
      'timestamp'
    );
  });

  it('shows required retention errors only after a submit attempt', () => {
    const defaultState = getDefaultState(getTransformConfigMock());
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
    } as unknown as ReturnType<typeof useGetTransformsPreview>);
    jest.mocked(useFormSections).mockReturnValue({
      retentionPolicy: {
        ...defaultState.formSections.retentionPolicy,
        enabled: true,
      },
    });
    jest.mocked(useRetentionPolicyField).mockReturnValue({
      ...defaultState.formFields.retentionPolicyField,
      errorMessages: ['A retention field is required.'],
    });

    const { rerender } = renderWithI18n(<EditTransformRetentionPolicy />);

    expect(screen.queryByText('A retention field is required.')).not.toBeInTheDocument();

    jest.mocked(useHasAttemptedSubmit).mockReturnValue(true);
    rerender(<EditTransformRetentionPolicy />);

    expect(screen.getByText('A retention field is required.')).toBeInTheDocument();
  });
});

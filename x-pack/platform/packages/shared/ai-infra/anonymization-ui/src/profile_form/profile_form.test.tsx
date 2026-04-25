/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useTargetIdField } from './hooks/use_target_id_field';
import { ProfileForm } from './profile_form';

jest.mock('./hooks/use_target_id_field', () => ({
  useTargetIdField: jest.fn(),
}));

const baseTargetIdField = {
  targetIdOptions: [],
  selectedTargetIdOptions: [],
  selectedTargetDisplayName: undefined,
  targetIdHelpText: null,
  targetIdAsyncError: undefined,
  isTargetIdValidating: false,
  isTargetIdLoading: false,
  onTargetIdSearchChange: jest.fn(),
  onTargetIdFocus: jest.fn(),
  onTargetIdSelectChange: jest.fn(),
  onTargetIdCreateOption: undefined,
  validateAndHydrateTargetId: jest.fn().mockResolvedValue(true),
};

const renderForm = (overrides: Partial<React.ComponentProps<typeof ProfileForm>> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);

  render(
    <I18nProvider>
      <ProfileForm
        isEdit={false}
        isManageMode
        name="Profile"
        description=""
        targetType="index"
        targetId="logs-1"
        fieldRules={[{ field: 'host.name', allowed: true, anonymized: false }]}
        regexRules={[]}
        nerRules={[]}
        isSubmitting={false}
        onNameChange={jest.fn()}
        onDescriptionChange={jest.fn()}
        onTargetTypeChange={jest.fn()}
        onTargetIdChange={jest.fn()}
        onFieldRulesChange={jest.fn()}
        onRegexRulesChange={jest.fn()}
        onNerRulesChange={jest.fn()}
        fetch={jest.fn()}
        onCancel={jest.fn()}
        onSubmit={onSubmit}
        {...overrides}
      />
    </I18nProvider>
  );

  return { onSubmit };
};

describe('ProfileForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useTargetIdField).mockReturnValue(baseTargetIdField);
  });

  it('validates current target before submit', async () => {
    const validateAndHydrateTargetId = jest.fn().mockResolvedValue(true);
    jest.mocked(useTargetIdField).mockReturnValue({
      ...baseTargetIdField,
      validateAndHydrateTargetId,
    });
    const { onSubmit } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(validateAndHydrateTargetId).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('shows target selection hint when no target fields are loaded', () => {
    renderForm({
      targetId: '',
      fieldRules: [],
    });

    expect(screen.getByText('Select a target to load field rules')).toBeInTheDocument();
  });

  it('shows hidden/system toggle after opening advanced settings', () => {
    renderForm();

    fireEvent.click(screen.getByText('Show advanced settings'));

    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('passes enabled hidden/system state to target lookup hook after switch toggle', async () => {
    renderForm();

    fireEvent.click(screen.getByText('Show advanced settings'));
    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => {
      expect(jest.mocked(useTargetIdField).mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          includeHiddenAndSystemIndices: true,
        })
      );
    });
  });
});

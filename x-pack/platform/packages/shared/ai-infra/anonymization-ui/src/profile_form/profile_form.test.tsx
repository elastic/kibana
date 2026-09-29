/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useTargetIdField } from './hooks/use_target_id_field';
import { ProfileForm } from './profile_form';

vi.mock('./hooks/use_target_id_field', () => {
      const mocked = {
      useTargetIdField: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const baseTargetIdField = {
  targetIdOptions: [],
  selectedTargetIdOptions: [],
  selectedTargetDisplayName: undefined,
  targetIdHelpText: null,
  targetIdAsyncError: undefined,
  isTargetIdValidating: false,
  isTargetIdLoading: false,
  onTargetIdSearchChange: vi.fn(),
  onTargetIdFocus: vi.fn(),
  onTargetIdSelectChange: vi.fn(),
  onTargetIdCreateOption: undefined,
  validateAndHydrateTargetId: vi.fn().mockResolvedValue(true),
};

const renderForm = (overrides: Partial<React.ComponentProps<typeof ProfileForm>> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);

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
        onNameChange={vi.fn()}
        onDescriptionChange={vi.fn()}
        onTargetTypeChange={vi.fn()}
        onTargetIdChange={vi.fn()}
        onFieldRulesChange={vi.fn()}
        onRegexRulesChange={vi.fn()}
        onNerRulesChange={vi.fn()}
        fetch={vi.fn()}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        {...overrides}
      />
    </I18nProvider>
  );

  return { onSubmit };
};

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTargetIdField).mockReturnValue(baseTargetIdField);
  });

  it('validates current target before submit', async () => {
    const validateAndHydrateTargetId = vi.fn().mockResolvedValue(true);
    vi.mocked(useTargetIdField).mockReturnValue({
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
      expect(vi.mocked(useTargetIdField).mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          includeHiddenAndSystemIndices: true,
        })
      );
    });
  });
});

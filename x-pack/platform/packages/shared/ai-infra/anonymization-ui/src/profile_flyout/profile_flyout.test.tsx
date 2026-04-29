/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ProfileFlyout } from './profile_flyout';
import type { ProfileFormProps } from '../profile_form/profile_form_props';
import type { ProfileFormContextValue } from '../profile_form/profile_form_context';
import type { UseTargetIdFieldResult } from '../profile_form/hooks/use_target_id_field';

const createBaseTargetIdField = (): UseTargetIdFieldResult => ({
  targetIdOptions: [],
  selectedTargetIdOptions: [],
  selectedTargetDisplayName: '',
  targetIdHelpText: null,
  targetIdAsyncError: '',
  isTargetIdValidating: false,
  isTargetIdLoading: false,
  onTargetIdSearchChange: jest.fn(),
  onTargetIdFocus: jest.fn(),
  onTargetIdSelectChange: jest.fn(),
  onTargetIdCreateOption: undefined,
  validateAndHydrateTargetId: jest.fn().mockResolvedValue(true),
});

let mockTargetIdField = createBaseTargetIdField();

jest.mock('../profile_form/profile_form_provider', () => {
  const mockReact: typeof import('react') = jest.requireActual('react');
  const { ProfileFormContextProvider } = jest.requireActual('../profile_form/profile_form_context');
  type MockProfileFormProviderProps = React.PropsWithChildren<ProfileFormProps>;

  return {
    ProfileFormProvider: (providerProps: MockProfileFormProviderProps) => {
      const { children, ...props } = providerProps;
      const [submitAttemptCount, setSubmitAttemptCount] = mockReact.useState(0);
      const onSubmitWithTargetValidation = async () => {
        setSubmitAttemptCount((count) => count + 1);
        const isTargetValid = await mockTargetIdField.validateAndHydrateTargetId();
        if (!isTargetValid) {
          return;
        }
        await props.onSubmit();
      };
      const value: ProfileFormContextValue = {
        ...props,
        onSubmit: onSubmitWithTargetValidation,
        targetIdField: mockTargetIdField,
        includeHiddenAndSystemIndices: false,
        onIncludeHiddenAndSystemIndicesChange: jest.fn(),
        submitAttemptCount,
      };

      return mockReact.createElement(
        ProfileFormContextProvider,
        {
          value,
        },
        children
      );
    },
  };
});

const renderFlyout = (overrides: Partial<React.ComponentProps<typeof ProfileFlyout>> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onCancel = jest.fn();

  const renderResult = render(
    <I18nProvider>
      <ProfileFlyout
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
        onCancel={onCancel}
        onSubmit={onSubmit}
        {...overrides}
      />
    </I18nProvider>
  );

  return { onSubmit, ...renderResult };
};

describe('ProfileFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTargetIdField = createBaseTargetIdField();
  });

  it('disables save while async target validation has an error', () => {
    mockTargetIdField = {
      ...createBaseTargetIdField(),
      targetIdAsyncError: 'Target id must resolve to a concrete index',
    };

    renderFlyout();

    expect(screen.getByRole('button', { name: 'Save profile' })).toBeDisabled();
  });

  it('validates current target before submit', async () => {
    const validateAndHydrateTargetId = jest.fn().mockResolvedValue(true);
    mockTargetIdField = {
      ...createBaseTargetIdField(),
      validateAndHydrateTargetId,
    };
    const { onSubmit } = renderFlyout();

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(validateAndHydrateTargetId).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('shows target selection hint when no target fields are loaded', () => {
    renderFlyout({
      targetId: '',
      fieldRules: [],
    });

    expect(screen.getByText('Select a target to load field rules')).toBeInTheDocument();
    expect(
      screen.getByText(
        'To configure field rules, first select a target index, index pattern, or data view.'
      )
    ).toBeInTheDocument();
  });

  it('shows privacy guidance text in the flyout header', () => {
    renderFlyout();

    expect(
      screen.getByText(
        'Define privacy settings for event data sent to third-party LLM providers. Create one profile per target (index, index pattern or data view) per space. Choose which fields to include and which to anonymize by replacing values with mask tokens.'
      )
    ).toBeInTheDocument();
  });

  it('shows an error indicator on the field rules tab when field rules are invalid', () => {
    const { container } = renderFlyout({
      fieldRulesError: 'Entity class is required for anonymized fields.',
    });

    expect(
      container.querySelector('[data-test-subj="anonymizationProfilesTabError-fieldRules"]')
    ).toBeTruthy();
  });

  it('switches back to field rules tab when a field rules error appears', () => {
    const { rerender } = renderFlyout();

    fireEvent.click(screen.getByRole('tab', { name: /^Regex rules/ }));
    expect(screen.getByRole('tab', { name: /^Regex rules/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    rerender(
      <I18nProvider>
        <ProfileFlyout
          isEdit={false}
          isManageMode
          name="Profile"
          description=""
          targetType="index"
          targetId="logs-1"
          fieldRules={[{ field: 'host.name', allowed: true, anonymized: false }]}
          regexRules={[]}
          nerRules={[]}
          fieldRulesError="Entity class is required for anonymized fields."
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
          onSubmit={jest.fn().mockResolvedValue(undefined)}
        />
      </I18nProvider>
    );

    expect(screen.getByRole('tab', { name: /^Field rules/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows an error indicator on the regex rules tab when regex rules are invalid', () => {
    const { container } = renderFlyout({
      regexRulesError: 'Regex pattern and entity class are required for regex rules',
    });

    expect(
      container.querySelector('[data-test-subj="anonymizationProfilesTabError-regexRules"]')
    ).toBeTruthy();
  });

  it('switches to regex rules tab when only regex rules error appears', () => {
    const { rerender } = renderFlyout();

    rerender(
      <I18nProvider>
        <ProfileFlyout
          isEdit={false}
          isManageMode
          name="Profile"
          description=""
          targetType="index"
          targetId="logs-1"
          fieldRules={[{ field: 'host.name', allowed: true, anonymized: false }]}
          regexRules={[]}
          nerRules={[]}
          regexRulesError="Regex pattern and entity class are required for regex rules"
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
          onSubmit={jest.fn().mockResolvedValue(undefined)}
        />
      </I18nProvider>
    );

    expect(screen.getByRole('tab', { name: /^Regex rules/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('shows an error indicator on the ner rules tab when ner rules are invalid', () => {
    const { container } = renderFlyout({
      nerRulesError:
        'NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC.',
    });

    expect(
      container.querySelector('[data-test-subj="anonymizationProfilesTabError-nerRules"]')
    ).toBeTruthy();
  });

  it('switches to ner rules tab when only ner rules error appears', () => {
    const { rerender } = renderFlyout();

    rerender(
      <I18nProvider>
        <ProfileFlyout
          isEdit={false}
          isManageMode
          name="Profile"
          description=""
          targetType="index"
          targetId="logs-1"
          fieldRules={[{ field: 'host.name', allowed: true, anonymized: false }]}
          regexRules={[]}
          nerRules={[]}
          nerRulesError="NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC."
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
          onSubmit={jest.fn().mockResolvedValue(undefined)}
        />
      </I18nProvider>
    );

    expect(screen.getByRole('tab', { name: /^NER rules/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('switches back to ner rules on save when ner error already exists', async () => {
    renderFlyout({
      nerRulesError:
        'NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC.',
    });

    fireEvent.click(screen.getByRole('tab', { name: /^Regex rules/ }));
    expect(screen.getByRole('tab', { name: /^Regex rules/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /^NER rules/ })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../../../common/mock';
import { customFieldsConfigurationMock, customFieldsMock } from '../../../../../containers/mock';
import { CustomFieldsSection } from './custom_fields_section';
import { SectionEditProvider } from '../../../../templates_v2/field_types/section_edit_context';
import { SidebarAccordionSection } from './sidebar_accordion_section';

/**
 * Exercised through a real `SectionEditProvider` and `SidebarAccordionSection`, matching how
 * `case_view_sidebar.tsx` wires them: `CustomFieldsSection` has no edit-mode state or Save/Cancel
 * bar of its own any more, both come from the provider and are rendered by the accordion's pinned
 * header — the same combination the template fields section uses.
 */
const renderSection = (onSave: jest.Mock) =>
  renderWithTestingProviders(
    <SectionEditProvider onSave={onSave}>
      <SidebarAccordionSection
        id="legacyCustomFields"
        title="Legacy custom fields"
        isOpen
        onToggle={jest.fn()}
      >
        <CustomFieldsSection
          isLoading={false}
          customFields={customFieldsMock}
          customFieldsConfiguration={customFieldsConfigurationMock}
        />
      </SidebarAccordionSection>
    </SectionEditProvider>
  );

describe('CustomFieldsSection', () => {
  let onSave: jest.Mock;

  beforeEach(() => {
    onSave = jest.fn();
  });

  it('renders every field as a label/value row, not an editable form', async () => {
    renderSection(onSave);

    expect(await screen.findByText('My test label 1')).toBeInTheDocument();
    expect(await screen.findByText('My text test value 1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('case-text-custom-field-form-field-test_key_1')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('opens every field for editing when any single field is clicked', async () => {
    renderSection(onSave);

    await userEvent.click(await screen.findByTestId('template-field-edit-test_key_1'));

    expect(
      await screen.findByTestId('case-text-custom-field-form-field-test_key_1')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('case-number-custom-field-form-field-test_key_5')
    ).toBeInTheDocument();
    expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);
  });

  it('shows an unsaved count and a per-field revert once a field changes', async () => {
    renderSection(onSave);

    await userEvent.click(await screen.findByTestId('template-field-edit-test_key_1'));
    await userEvent.click(
      await screen.findByTestId('case-text-custom-field-form-field-test_key_1')
    );
    await userEvent.paste('!!!');

    expect(await screen.findByTestId('section-edit-changed-count')).toHaveTextContent(
      '1 unsaved field'
    );
    expect(await screen.findByTestId('case-custom-field-revert-test_key_1')).toBeInTheDocument();
  });

  it('saves only the changed fields and leaves edit mode on success', async () => {
    onSave.mockImplementation((_values, { onSuccess }) => onSuccess());
    renderSection(onSave);

    await userEvent.click(await screen.findByTestId('template-field-edit-test_key_1'));
    await userEvent.click(
      await screen.findByTestId('case-text-custom-field-form-field-test_key_1')
    );
    await userEvent.paste('!!!');

    await userEvent.click(await screen.findByTestId('section-edit-save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        { test_key_1: { ...customFieldsMock[0], value: 'My text test value 1!!!' } },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      );
    });

    // Back to the label/value view, and it reflects the (locally re-baselined) committed edit.
    expect(
      screen.queryByTestId('case-text-custom-field-form-field-test_key_1')
    ).not.toBeInTheDocument();
  });

  it('discards buffered changes and leaves edit mode on cancel', async () => {
    renderSection(onSave);

    await userEvent.click(await screen.findByTestId('template-field-edit-test_key_1'));
    const textField = await screen.findByTestId('case-text-custom-field-form-field-test_key_1');
    await userEvent.click(textField);
    await userEvent.paste('!!!');

    expect(await screen.findByTestId('section-edit-changed-count')).toHaveTextContent(
      '1 unsaved field'
    );

    await userEvent.click(await screen.findByTestId('section-edit-cancel'));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('case-text-custom-field-form-field-test_key_1')
    ).not.toBeInTheDocument();
    expect(await screen.findByText('My text test value 1')).toBeInTheDocument();
  });

  it('reverting a single field clears just that field from the buffer', async () => {
    renderSection(onSave);

    await userEvent.click(await screen.findByTestId('template-field-edit-test_key_1'));
    await userEvent.click(
      await screen.findByTestId('case-text-custom-field-form-field-test_key_1')
    );
    await userEvent.paste('!!!');

    expect(await screen.findByTestId('section-edit-changed-count')).toHaveTextContent(
      '1 unsaved field'
    );

    await userEvent.click(await screen.findByTestId('case-custom-field-revert-test_key_1'));

    await waitFor(() => {
      expect(screen.queryByTestId('case-custom-field-revert-test_key_1')).not.toBeInTheDocument();
    });
    expect(await screen.findByTestId('case-text-custom-field-form-field-test_key_1')).toHaveValue(
      'My text test value 1'
    );
  });
});

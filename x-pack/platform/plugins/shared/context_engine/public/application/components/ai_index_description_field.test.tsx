/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../common/constants';
import { validateTextInput } from '../utils/validate_text_input';
import { AiIndexDescriptionField } from './ai_index_description_field';

const ControlledField = ({ initialValue = '' }: { initialValue?: string }) => {
  const [value, setValue] = useState(initialValue);
  const { error, warning } = validateTextInput({
    value,
    maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
  });

  return (
    <AiIndexDescriptionField
      value={value}
      onChange={setValue}
      error={error}
      warning={warning}
      data-test-subj="contextAiIndexDescriptionInput"
    />
  );
};

const renderField = (initialValue = '') =>
  render(
    <I18nProvider>
      <EuiProvider>
        <ControlledField initialValue={initialValue} />
      </EuiProvider>
    </I18nProvider>
  );

describe('AiIndexDescriptionField', () => {
  it('shows help text for a short description', () => {
    renderField();

    expect(
      screen.getByText(
        /Important: This description shapes generated automation workflows and helps agents decide when the index is relevant/
      )
    ).toBeInTheDocument();
  });

  it('shows placeholder guidance for what to include', () => {
    renderField();

    expect(screen.getByTestId('contextAiIndexDescriptionInput')).toHaveAttribute(
      'placeholder',
      'Describe what this AI index is for and the information its Knowledge Indicators contain. Include example questions they should help answer and any known gaps in that information.'
    );
  });

  it('shows a warning when the description is within 5% of the max length', () => {
    renderField('a'.repeat(MAX_AI_INDEX_DESCRIPTION_LENGTH - 10));

    expect(screen.getByText(/10 characters remaining/)).toBeInTheDocument();
  });

  it('shows an error when the description exceeds the max length', () => {
    renderField('a'.repeat(MAX_AI_INDEX_DESCRIPTION_LENGTH + 1));

    expect(screen.getByText(/1 character over the 2,048 character limit/)).toBeInTheDocument();
  });

  it('updates the value when the user types', () => {
    renderField();

    fireEvent.change(screen.getByTestId('contextAiIndexDescriptionInput'), {
      target: { value: 'Updated description' },
    });

    expect(screen.getByTestId('contextAiIndexDescriptionInput')).toHaveValue('Updated description');
  });
});

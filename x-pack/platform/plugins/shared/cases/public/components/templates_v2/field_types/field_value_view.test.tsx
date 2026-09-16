/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { FieldType } from '../../../../common/types/domain/template/fields';
import { FieldValueView } from './field_value_view';

describe('FieldValueView', () => {
  it('wraps long text values and opens the native editor only after selecting Edit', async () => {
    const onEdit = jest.fn();
    const longValue =
      'This is a long field value that remains readable in the case details sidebar instead of being truncated by a single-line input.';

    renderWithTestingProviders(
      <FieldValueView
        field={{
          name: 'investigation_notes',
          label: 'Investigation notes',
          control: FieldType.INPUT_TEXT,
          type: 'keyword',
        }}
        value={longValue}
        isRequired={false}
        isRequiredOnClose={false}
        onEdit={onEdit}
      />
    );

    expect(screen.getByTestId('template-field-value-text-investigation_notes')).toHaveTextContent(
      longValue
    );
    // The row itself is the edit control, so its accessible name names the field it edits.
    await userEvent.click(screen.getByRole('button', { name: 'Edit Investigation notes' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders saved people by name rather than their serialized field value', () => {
    renderWithTestingProviders(
      <FieldValueView
        field={{
          name: 'reviewers',
          label: 'Reviewers',
          control: FieldType.USER_PICKER,
          type: 'keyword',
        }}
        value={JSON.stringify([
          { uid: 'alice-uid', name: 'Alice' },
          { uid: 'bob-uid', name: 'Bob' },
        ])}
        isRequired={false}
        isRequiredOnClose={false}
      />
    );

    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
  });
});

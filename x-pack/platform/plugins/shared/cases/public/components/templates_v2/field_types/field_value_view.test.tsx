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

  it('renders a markdown textarea value as formatted HTML instead of raw markdown', () => {
    renderWithTestingProviders(
      <FieldValueView
        field={{
          name: 'notes',
          label: 'Notes',
          control: FieldType.TEXTAREA,
          type: 'keyword',
          metadata: { markdown: true },
        }}
        value="[Visit Elastic](https://elastic.co)"
        isRequired={false}
        isRequiredOnClose={false}
      />
    );

    // The link text must be rendered as an anchor, not raw markdown syntax.
    const link = screen.getByRole('link', { name: 'Visit Elastic' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://elastic.co');
    expect(screen.queryByText('[Visit Elastic](https://elastic.co)')).not.toBeInTheDocument();
  });

  it('does not open edit mode when clicking a link inside a markdown textarea', async () => {
    const onEdit = jest.fn();

    renderWithTestingProviders(
      <FieldValueView
        field={{
          name: 'notes',
          label: 'Notes',
          control: FieldType.TEXTAREA,
          type: 'keyword',
          metadata: { markdown: true },
        }}
        value="[Visit Elastic](https://elastic.co)"
        isRequired={false}
        isRequiredOnClose={false}
        onEdit={onEdit}
      />
    );

    await userEvent.click(screen.getByRole('link', { name: 'Visit Elastic' }));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('renders a plain textarea value as text without markdown parsing', () => {
    renderWithTestingProviders(
      <FieldValueView
        field={{
          name: 'notes',
          label: 'Notes',
          control: FieldType.TEXTAREA,
          type: 'keyword',
        }}
        value="plain text value"
        isRequired={false}
        isRequiredOnClose={false}
      />
    );

    expect(screen.getByText('plain text value')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders a textarea with explicit markdown:false as plain text', () => {
    renderWithTestingProviders(
      <FieldValueView
        field={{
          name: 'notes',
          label: 'Notes',
          control: FieldType.TEXTAREA,
          type: 'keyword',
          metadata: { markdown: false },
        }}
        value="[not a link](https://elastic.co)"
        isRequired={false}
        isRequiredOnClose={false}
      />
    );

    expect(screen.getByText('[not a link](https://elastic.co)')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryStreamFieldDescriptionFlyout } from './query_stream_schema_editor';
import type { SchemaEditorField } from '../data_management/schema_editor/types';

const user = userEvent.setup({ pointerEventsCheck: 0 });

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('QueryStreamFieldDescriptionFlyout', () => {
  const mockField: SchemaEditorField = {
    name: 'test_field',
    type: 'keyword',
    parent: 'test-query-stream',
    status: 'mapped',
    description: 'Initial description',
  };

  it('renders field name and type', () => {
    render(
      <Wrapper>
        <QueryStreamFieldDescriptionFlyout
          field={mockField}
          onClose={jest.fn()}
          onSave={jest.fn()}
          isSaving={false}
        />
      </Wrapper>
    );

    expect(screen.getByText('test_field')).toBeInTheDocument();
    expect(screen.getByText('keyword')).toBeInTheDocument();
  });

  it('shows text area with existing description', () => {
    render(
      <Wrapper>
        <QueryStreamFieldDescriptionFlyout
          field={mockField}
          onClose={jest.fn()}
          onSave={jest.fn()}
          isSaving={false}
        />
      </Wrapper>
    );

    const textarea = screen.getByTestId('streamsAppQueryStreamFieldDescriptionTextArea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('Initial description');
  });

  it('shows empty text area when field has no description', () => {
    const fieldWithoutDescription: SchemaEditorField = {
      name: 'empty_field',
      type: 'keyword',
      parent: 'test-query-stream',
      status: 'mapped',
    };

    render(
      <Wrapper>
        <QueryStreamFieldDescriptionFlyout
          field={fieldWithoutDescription}
          onClose={jest.fn()}
          onSave={jest.fn()}
          isSaving={false}
        />
      </Wrapper>
    );

    const textarea = screen.getByTestId('streamsAppQueryStreamFieldDescriptionTextArea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('');
  });

  it('calls onSave with updated description', async () => {
    const mockOnSave = jest.fn();

    render(
      <Wrapper>
        <QueryStreamFieldDescriptionFlyout
          field={mockField}
          onClose={jest.fn()}
          onSave={mockOnSave}
          isSaving={false}
        />
      </Wrapper>
    );

    const textarea = screen.getByTestId('streamsAppQueryStreamFieldDescriptionTextArea');
    await user.clear(textarea);
    await user.type(textarea, 'New description');

    await user.click(screen.getByTestId('streamsAppQueryStreamFieldSaveButton'));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test_field',
        description: 'New description',
      })
    );
  });

  it('disables save button when no changes', () => {
    render(
      <Wrapper>
        <QueryStreamFieldDescriptionFlyout
          field={mockField}
          onClose={jest.fn()}
          onSave={jest.fn()}
          isSaving={false}
        />
      </Wrapper>
    );

    const saveButton = screen.getByTestId('streamsAppQueryStreamFieldSaveButton');
    expect(saveButton).toBeDisabled();
  });

  it('displays field type correctly', () => {
    const fieldWithLongType: SchemaEditorField = {
      name: 'no_desc_field',
      type: 'long',
      parent: 'test-query-stream',
      status: 'mapped',
    };

    render(
      <Wrapper>
        <QueryStreamFieldDescriptionFlyout
          field={fieldWithLongType}
          onClose={jest.fn()}
          onSave={jest.fn()}
          isSaving={false}
        />
      </Wrapper>
    );

    expect(screen.getByText('no_desc_field')).toBeInTheDocument();
    expect(screen.getByText('Number (long)')).toBeInTheDocument();
  });

  it('allows clearing description by saving empty string', async () => {
    const mockOnSave = jest.fn();

    render(
      <Wrapper>
        <QueryStreamFieldDescriptionFlyout
          field={mockField}
          onClose={jest.fn()}
          onSave={mockOnSave}
          isSaving={false}
        />
      </Wrapper>
    );

    const textarea = screen.getByTestId('streamsAppQueryStreamFieldDescriptionTextArea');
    await user.clear(textarea);

    await user.click(screen.getByTestId('streamsAppQueryStreamFieldSaveButton'));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test_field',
        description: undefined,
      })
    );
  });
});

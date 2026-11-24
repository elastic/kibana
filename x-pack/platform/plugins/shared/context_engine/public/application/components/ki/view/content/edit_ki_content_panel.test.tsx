/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { EditKiContentPanel } from './edit_ki_content_panel';

interface MarkdownEditorMockProps {
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
}

const mockMarkdownEditor = jest.fn((_props: MarkdownEditorMockProps) => null);

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiMarkdownEditor: (props: MarkdownEditorMockProps) => mockMarkdownEditor(props),
  };
});

const renderEditPanel = (props: Partial<React.ComponentProps<typeof EditKiContentPanel>> = {}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <EditKiContentPanel content="Hello world" {...props} />
      </EuiProvider>
    </I18nProvider>
  );

const getLatestEditorProps = (): MarkdownEditorMockProps => {
  const latestCall = mockMarkdownEditor.mock.calls.at(-1);
  if (!latestCall) {
    throw new Error('EuiMarkdownEditor was not rendered');
  }
  return latestCall[0];
};

const changeEditorContent = (next: string) => {
  act(() => {
    getLatestEditorProps().onChange(next);
  });
};

describe('EditKiContentPanel', () => {
  beforeEach(() => {
    mockMarkdownEditor.mockClear();
  });

  it('passes readOnly to the markdown editor while saving', () => {
    renderEditPanel({ isSaving: true });

    expect(mockMarkdownEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        readOnly: true,
        value: 'Hello world',
      })
    );
  });

  it('does not set readOnly on the markdown editor when not saving', () => {
    renderEditPanel();

    expect(mockMarkdownEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        readOnly: false,
        value: 'Hello world',
      })
    );
  });

  it('saves when content changed', () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();

    renderEditPanel({ onCancel, onSave });

    expect(screen.getByTestId('contextViewKiSaveButton')).toBeDisabled();

    changeEditorContent('Updated content');

    expect(screen.getByTestId('contextViewKiSaveButton')).toBeEnabled();
    fireEvent.click(screen.getByTestId('contextViewKiSaveButton'));

    expect(onSave).toHaveBeenCalledWith({ content: 'Updated content' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('disables the cancel button while saving', () => {
    renderEditPanel({ isSaving: true });

    expect(screen.getByTestId('contextViewKiCancelButton')).toBeDisabled();
  });

  it('cancels and notifies the parent', () => {
    const onCancel = jest.fn();

    renderEditPanel({ onCancel });

    changeEditorContent('Draft change');
    fireEvent.click(screen.getByTestId('contextViewKiCancelButton'));

    expect(onCancel).toHaveBeenCalledWith();
  });
});

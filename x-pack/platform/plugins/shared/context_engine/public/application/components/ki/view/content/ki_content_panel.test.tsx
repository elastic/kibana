/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { KiContentPanel } from './ki_content_panel';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiMarkdownEditor: ({
      value,
      onChange,
      'data-test-subj': testSubj,
    }: {
      value: string;
      onChange: (next: string) => void;
      'data-test-subj'?: string;
    }) => (
      <textarea
        data-test-subj={testSubj}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  };
});

const renderPanel = (
  document: KiDocument,
  props: Partial<React.ComponentProps<typeof KiContentPanel>> = {}
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KiContentPanel document={document} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

describe('KiContentPanel', () => {
  it('renders content when document.content is a non-empty string', () => {
    renderPanel({ content: 'Hello world' });

    expect(screen.getByTestId('contextViewKiContent')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContentEmpty')).not.toBeInTheDocument();
  });

  it('renders empty state when content is missing', () => {
    renderPanel({});

    expect(screen.getByTestId('contextViewKiContentEmpty')).toHaveTextContent('No content');
    expect(screen.queryByTestId('contextViewKiContent')).not.toBeInTheDocument();
  });

  it('renders empty state when content is an empty string', () => {
    renderPanel({ content: '' });

    expect(screen.getByTestId('contextViewKiContentEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContent')).not.toBeInTheDocument();
  });

  it('renders the loading skeleton when isLoading is true', () => {
    renderPanel({ content: 'Hello world' }, { isLoading: true });

    expect(screen.getByTestId('contextViewKiContentLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextViewKiContent')).not.toBeInTheDocument();
  });

  it('renders markdown editor in edit mode and saves when content changed', () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();

    renderPanel(
      { content: 'Hello world' },
      {
        isEditing: true,
        onCancel,
        onSave,
      }
    );

    expect(screen.getByTestId('contextViewKiContentEditing')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiSaveButton')).toBeDisabled();

    fireEvent.change(screen.getByTestId('contextViewKiContentField'), {
      target: { value: 'Updated content' },
    });

    expect(screen.getByTestId('contextViewKiSaveButton')).toBeEnabled();
    fireEvent.click(screen.getByTestId('contextViewKiSaveButton'));

    expect(onSave).toHaveBeenCalledWith({ content: 'Updated content' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('disables the cancel button while saving', () => {
    renderPanel(
      { content: 'Hello world' },
      {
        isEditing: true,
        isSaving: true,
      }
    );

    expect(screen.getByTestId('contextViewKiCancelButton')).toBeDisabled();
  });

  it('cancels edit mode and resets draft', () => {
    const onCancel = jest.fn();

    renderPanel(
      { content: 'Hello world' },
      {
        isEditing: true,
        onCancel,
      }
    );

    fireEvent.change(screen.getByTestId('contextViewKiContentField'), {
      target: { value: 'Draft change' },
    });
    fireEvent.click(screen.getByTestId('contextViewKiCancelButton'));

    expect(onCancel).toHaveBeenCalledWith();
  });
});

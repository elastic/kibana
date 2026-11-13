/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetKiResponse } from '../../../../../common/http_api/knowledge_indicators';
import { renderListKiWithProviders } from '../list/test_helpers';
import { KiViewer } from './ki_viewer';

const mockUseKi = jest.fn();

const mockUpdateMutate = jest.fn();
const mockDeleteMutate = jest.fn();
const mockRestoreMutate = jest.fn();

jest.mock('../../../hooks/use_ki', () => ({
  useKi: (args: unknown) => mockUseKi(args),
}));

jest.mock('../../../hooks/use_ki_mutations', () => ({
  useUpdateKi: () => ({ mutate: mockUpdateMutate, isLoading: false }),
  useDeleteKi: () => ({ mutate: mockDeleteMutate, isLoading: false }),
  useRestoreKi: () => ({ mutate: mockRestoreMutate, isLoading: false }),
}));

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

const defaultKi: GetKiResponse = {
  id: 'ki-1',
  document: {
    title: 'Refund playbook',
    content: '# Hello\n\nSome **content**',
    type: 'playbook',
    tags: ['billing', 'refunds'],
    updated_at: '2026-01-15T12:00:00.000Z',
  },
};

const selectedKi = { kiId: 'ki-1', index: 'backing-1' };

const renderViewer = (
  ki: Partial<ReturnType<typeof mockUseKi>> = {},
  index = 'backing-1',
  { canWrite = false }: { canWrite?: boolean } = {}
) => {
  mockUseKi.mockReturnValue({ ki: defaultKi, isLoading: false, error: undefined, ...ki });
  return renderListKiWithProviders(
    <KiViewer aiIndexId="sample-ki" selectedKi={{ ...selectedKi, index }} />,
    { canWrite }
  );
};

const deletedKi: GetKiResponse = {
  ...defaultKi,
  document: { ...defaultKi.document, governance: { lifecycle: { status: 'deleted' } } },
};

/** Calls the mutation's onSuccess / onError option like react-query would. */
const succeed = (mutate: jest.Mock) =>
  mutate.mockImplementation((_vars: unknown, options: { onSuccess: () => void }) =>
    options.onSuccess()
  );

describe('KiViewer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads the selected document', () => {
    renderViewer();
    expect(mockUseKi).toHaveBeenCalledWith({
      aiIndexId: 'sample-ki',
      kiId: 'ki-1',
      index: 'backing-1',
      enabled: true,
    });
  });

  it('renders the title, badges, updated date and Markdown content', () => {
    renderViewer();

    expect(screen.getByTestId('contextKiViewerTitle')).toHaveTextContent('Refund playbook');
    expect(screen.getByTestId('contextViewKiTypeBadge')).toHaveTextContent('playbook');
    expect(screen.queryByTestId('contextViewKiStatusBadge')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('contextViewKiTagBadge').map((b) => b.textContent)).toEqual([
      'billing',
      'refunds',
    ]);
    expect(screen.getByTestId('contextViewKiUpdatedAt')).toHaveTextContent('Updated');
    expect(
      screen.getByTestId('contextViewKiMarkdownRendered').querySelector('h1')
    ).toHaveTextContent('Hello');
  });

  it('shows the status badge when the document is not active', () => {
    renderViewer({
      ki: {
        ...defaultKi,
        document: { ...defaultKi.document, governance: { lifecycle: { status: 'deleted' } } },
      },
    });
    expect(screen.getByTestId('contextViewKiStatusBadge')).toHaveTextContent('deleted');
  });

  it('opens on Content and switches to the Document (JSON) view', () => {
    renderViewer();

    expect(screen.getByTestId('contextKiViewerMode-content')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.queryByTestId('contextViewKiRawJsonPanel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextKiViewerMode-document'));

    expect(screen.getByTestId('contextViewKiRawJsonPanel')).toHaveTextContent('"Refund playbook"');
    expect(screen.queryByTestId('contextViewKiMarkdownRendered')).not.toBeInTheDocument();
  });

  it('keeps Details and attributes closed until opened', () => {
    renderViewer();
    const details = screen.getByTestId('contextKiViewerDetails');
    const toggle = details.querySelector('button');

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle as HTMLButtonElement);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('contextViewKiMetadataPanel')).toBeInTheDocument();
  });

  it('shows loading placeholders', () => {
    renderViewer({ ki: undefined, isLoading: true });
    expect(screen.getByTestId('contextKiViewerTitleLoading')).toBeInTheDocument();
    expect(screen.getByTestId('contextViewKiContentLoading')).toBeInTheDocument();
  });

  it('shows an error prompt', () => {
    renderViewer({ ki: undefined, error: new Error('Not found') });
    expect(screen.getByTestId('contextViewKiError')).toHaveTextContent('Not found');
  });

  it('shows the missing index prompt without an index', () => {
    renderViewer({}, '');
    expect(screen.getByTestId('contextViewKiMissingIndex')).toBeInTheDocument();
  });

  describe('actions', () => {
    it('hides Edit and Delete without write privilege', () => {
      renderViewer();
      expect(screen.queryByTestId('contextKiViewerActions')).not.toBeInTheDocument();
    });

    it('shows Edit and Delete under the document', () => {
      renderViewer({}, 'backing-1', { canWrite: true });
      expect(screen.getByTestId('contextViewKiEditButton')).toHaveTextContent('Edit');
      expect(screen.getByTestId('contextViewKiDeleteButton')).toHaveTextContent('Delete');
      expect(screen.queryByTestId('contextViewKiRestoreButton')).not.toBeInTheDocument();
    });

    it('deletes without a confirm and shows the prototype toast', () => {
      succeed(mockDeleteMutate);
      const { services } = renderViewer({}, 'backing-1', { canWrite: true });

      fireEvent.click(screen.getByTestId('contextViewKiDeleteButton'));

      expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Deleted. It stays listed for reference and agents no longer retrieve it.',
      });
    });

    it('shows an error toast when delete fails', () => {
      mockDeleteMutate.mockImplementation(
        (_vars: unknown, options: { onError: (error: Error) => void }) =>
          options.onError(new Error('nope'))
      );
      const { services } = renderViewer({}, 'backing-1', { canWrite: true });

      fireEvent.click(screen.getByTestId('contextViewKiDeleteButton'));

      expect(services.notifications.toasts.addError).toHaveBeenCalledWith(new Error('nope'), {
        title: 'Unable to delete Knowledge document',
      });
    });

    it('shows Restore instead of Delete for a deleted document, and a disabled Edit', () => {
      succeed(mockRestoreMutate);
      const { services } = renderViewer({ ki: deletedKi }, 'backing-1', { canWrite: true });

      expect(screen.queryByTestId('contextViewKiDeleteButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('contextViewKiEditButton')).toBeDisabled();

      fireEvent.click(screen.getByTestId('contextViewKiRestoreButton'));

      expect(mockRestoreMutate).toHaveBeenCalledTimes(1);
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Restored. Agents can retrieve it again.',
      });
    });

    it('edits the content inline and saves it', async () => {
      succeed(mockUpdateMutate);
      renderViewer({}, 'backing-1', { canWrite: true });

      fireEvent.click(screen.getByTestId('contextViewKiEditButton'));

      expect(screen.queryByTestId('contextKiViewerActions')).not.toBeInTheDocument();
      expect(screen.getByTestId('contextKiViewerMode-document')).toBeDisabled();

      fireEvent.change(screen.getByTestId('contextViewKiContentField'), {
        target: { value: 'New body' },
      });
      fireEvent.click(screen.getByTestId('contextViewKiSaveButton'));

      expect(mockUpdateMutate).toHaveBeenCalledWith({ content: 'New body' }, expect.any(Object));
      await waitFor(() =>
        expect(screen.queryByTestId('contextViewKiContentField')).not.toBeInTheDocument()
      );
      expect(screen.getByTestId('contextKiViewerActions')).toBeInTheDocument();
    });

    it('asks before another document opens while editing', () => {
      const { history, services } = renderViewer({}, 'backing-1', { canWrite: true });
      fireEvent.click(screen.getByTestId('contextViewKiEditButton'));

      history.push('/ai_index/sample-ki/knowledge_indicators?doc=ki-2&index=backing-1');

      expect(services.overlays.openConfirm).toHaveBeenCalledWith(
        'Your edits to this Knowledge document will be lost.',
        expect.objectContaining({ title: 'Discard unsaved changes?' })
      );
      expect(history.location.search).toBe('');
    });
  });
});

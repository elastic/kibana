/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { GetKiResponse } from '../../../../../common/http_api/knowledge_indicators';
import { renderListKiWithProviders } from '../list/test_helpers';
import { KiViewer } from './ki_viewer';

const mockUseKi = jest.fn();

jest.mock('../../../hooks/use_ki', () => ({
  useKi: (args: unknown) => mockUseKi(args),
}));

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

const renderViewer = (ki: Partial<ReturnType<typeof mockUseKi>> = {}, index = 'backing-1') => {
  mockUseKi.mockReturnValue({ ki: defaultKi, isLoading: false, error: undefined, ...ki });
  return renderListKiWithProviders(
    <KiViewer aiIndexId="sample-ki" selectedKi={{ ...selectedKi, index }} />
  );
};

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
});

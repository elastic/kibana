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
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_PATHS } from '../../../paths';
import { AdvancedSection } from './advanced_section';

const navigateToContextEngine = jest.fn();

jest.mock('../../../hooks/use_navigation', () => ({
  useNavigation: () => ({
    navigateToContextEngine,
  }),
}));

jest.mock('../../ai_index_list', () => ({
  AiIndexDeleteConfirmModal: ({
    onClose,
    onSuccess,
  }: {
    onClose: () => void;
    onSuccess: () => void;
  }) => (
    <div data-test-subj="contextAiIndexDeleteConfirmModalStub">
      <button type="button" data-test-subj="contextAiIndexDeleteModalClose" onClick={onClose}>
        Close
      </button>
      <button type="button" data-test-subj="contextAiIndexDeleteModalSuccess" onClick={onSuccess}>
        Success
      </button>
    </div>
  ),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderSection = (indexManagementHref: string | undefined = undefined) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <AdvancedSection aiIndex={aiIndex} indexManagementHref={indexManagementHref} />
      </EuiProvider>
    </I18nProvider>
  );

describe('AdvancedSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the backing index name', () => {
    renderSection();

    expect(screen.getByTestId('contextAiIndexSettingsBackingIndexName')).toHaveTextContent(
      'ai-index-ds-my-ai-index'
    );
  });

  it('renders the backing index as plain text when indexManagementHref is undefined', () => {
    renderSection(undefined);

    const backingIndex = screen.getByTestId('contextAiIndexSettingsBackingIndexName');
    expect(backingIndex).toHaveTextContent('ai-index-ds-my-ai-index');
    expect(backingIndex.tagName).not.toBe('A');
  });

  it('renders the backing index as a link when indexManagementHref is set', () => {
    renderSection('/app/management/data/index_management');

    const link = screen.getByTestId('contextAiIndexSettingsBackingIndexName');
    expect(link).toHaveAttribute('href', '/app/management/data/index_management');
    expect(link).toHaveTextContent('ai-index-ds-my-ai-index');
  });

  it('opens the delete modal when Delete is clicked', () => {
    renderSection();

    expect(screen.queryByTestId('contextAiIndexDeleteConfirmModalStub')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextAiIndexSettingsDeleteButton'));
    expect(screen.getByTestId('contextAiIndexDeleteConfirmModalStub')).toBeInTheDocument();
  });

  it('navigates to the landing page when delete succeeds', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('contextAiIndexSettingsDeleteButton'));
    fireEvent.click(screen.getByTestId('contextAiIndexDeleteModalSuccess'));

    expect(navigateToContextEngine).toHaveBeenCalledWith(CONTEXT_ENGINE_PATHS.landing);
  });

  it('disables the delete button for managed AI indexes', () => {
    render(
      <I18nProvider>
        <EuiProvider>
          <AdvancedSection
            aiIndex={{ ...aiIndex, managed: true }}
            indexManagementHref={undefined}
          />
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexSettingsDeleteButton')).toBeDisabled();
  });
});

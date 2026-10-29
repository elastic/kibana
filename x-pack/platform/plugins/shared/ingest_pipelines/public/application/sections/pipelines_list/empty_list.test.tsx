/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';

import { EmptyList } from './empty_list';

const mockUseKibana = jest.fn();

jest.mock('../../../shared_imports', () => ({
  ...jest.requireActual('../../../shared_imports'),
  useKibana: () => mockUseKibana(),
}));

const renderEmptyList = ({ canManage }: { canManage: boolean }) => {
  mockUseKibana.mockReturnValue({
    services: {
      config: { enableManageProcessors: false, canRead: true, canManage },
      documentation: { getIngestNodeUrl: () => 'http://docs' },
    },
  });

  return render(
    <I18nProvider>
      <Router history={createMemoryHistory()}>
        <EmptyList />
      </Router>
    </I18nProvider>
  );
};

describe('EmptyList', () => {
  describe('WHEN the user can manage pipelines', () => {
    it('SHOULD render the create pipeline prompt', () => {
      renderEmptyList({ canManage: true });

      expect(screen.getByTestId('title')).toHaveTextContent('Create your first pipeline');
      expect(screen.getByTestId('emptyStateCreatePipelineDropdown')).toBeInTheDocument();
    });
  });

  describe('WHEN the user can only read pipelines', () => {
    it('SHOULD render the read-only prompt without the create pipeline action', () => {
      renderEmptyList({ canManage: false });

      expect(screen.getByTestId('title')).toHaveTextContent('No ingest pipelines');
      expect(
        screen.getByText(
          'There are no ingest pipelines to display. Creating a pipeline requires the manage_pipeline cluster privilege.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('Learn more')).toBeInTheDocument();
      expect(screen.queryByTestId('emptyStateCreatePipelineDropdown')).not.toBeInTheDocument();
    });
  });
});

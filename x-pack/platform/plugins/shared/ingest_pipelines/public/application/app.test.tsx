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
import { App } from './app';

const mockUseKibana = jest.fn();

jest.mock('../shared_imports', () => ({
  ...jest.requireActual('../shared_imports'),
  useKibana: () => mockUseKibana(),
}));

jest.mock('./sections', () => ({
  PipelinesList: () => <div data-test-subj="pipelinesList" />,
  PipelinesCreate: () => <div data-test-subj="pipelinesCreate" />,
  PipelinesEdit: () => <div data-test-subj="pipelinesEdit" />,
  PipelinesClone: () => <div data-test-subj="pipelinesClone" />,
  PipelinesCreateFromCsv: () => <div data-test-subj="pipelinesCreateFromCsv" />,
  ManageProcessors: () => <div data-test-subj="manageProcessors" />,
}));

const MANAGEMENT_ROUTES = [
  { path: '/create', testSubj: 'pipelinesCreate' },
  { path: '/edit/my-pipeline', testSubj: 'pipelinesEdit' },
  { path: '/create/my-pipeline', testSubj: 'pipelinesClone' },
  { path: '/csv_create', testSubj: 'pipelinesCreateFromCsv' },
  { path: '/manage_processors', testSubj: 'manageProcessors' },
] as const;

const renderApp = ({
  canRead,
  canManage,
  path = '/',
}: {
  canRead: boolean;
  canManage: boolean;
  path?: string;
}) => {
  mockUseKibana.mockReturnValue({
    services: {
      history: createMemoryHistory({ initialEntries: [path] }),
      config: { enableManageProcessors: true, canRead, canManage },
    },
  });

  return render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );
};

describe('App', () => {
  describe('WHEN the user can manage pipelines', () => {
    it('SHOULD render the pipelines list', () => {
      renderApp({ canRead: true, canManage: true });

      expect(screen.getByTestId('pipelinesList')).toBeInTheDocument();
      expect(screen.queryByText('Cluster privileges required')).not.toBeInTheDocument();
    });

    it.each(MANAGEMENT_ROUTES)(
      'SHOULD render the $testSubj route at $path',
      ({ path, testSubj }) => {
        renderApp({ canRead: true, canManage: true, path });

        expect(screen.getByTestId(testSubj)).toBeInTheDocument();
        expect(screen.queryByTestId('pipelinesList')).not.toBeInTheDocument();
      }
    );
  });

  describe('WHEN the user can only read pipelines', () => {
    it('SHOULD render the pipelines list', () => {
      renderApp({ canRead: true, canManage: false });

      expect(screen.getByTestId('pipelinesList')).toBeInTheDocument();
      expect(screen.queryByText('Cluster privileges required')).not.toBeInTheDocument();
    });

    it.each(MANAGEMENT_ROUTES)(
      'SHOULD fall back to the pipelines list instead of $testSubj at $path',
      ({ path, testSubj }) => {
        renderApp({ canRead: true, canManage: false, path });

        expect(screen.getByTestId('pipelinesList')).toBeInTheDocument();
        expect(screen.queryByTestId(testSubj)).not.toBeInTheDocument();
      }
    );
  });

  describe('WHEN the user can neither read nor manage pipelines', () => {
    it('SHOULD render the missing privileges prompt with the required privileges', () => {
      renderApp({ canRead: false, canManage: false });

      expect(screen.getByText('Cluster privileges required')).toBeInTheDocument();
      expect(
        screen.getByText(
          'To view Ingest Pipelines, you must have the read_pipeline cluster privilege. To manage them, you must have the manage_pipeline cluster privilege.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByTestId('pipelinesList')).not.toBeInTheDocument();
    });
  });
});

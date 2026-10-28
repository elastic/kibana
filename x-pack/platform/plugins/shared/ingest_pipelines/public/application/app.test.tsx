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
  PipelinesCreate: () => null,
  PipelinesEdit: () => null,
  PipelinesClone: () => null,
  PipelinesCreateFromCsv: () => null,
  ManageProcessors: () => null,
}));

const renderApp = (canManage: boolean) => {
  mockUseKibana.mockReturnValue({
    services: {
      history: createMemoryHistory({ initialEntries: ['/'] }),
      config: { enableManageProcessors: false, canManage },
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
      renderApp(true);

      expect(screen.getByTestId('pipelinesList')).toBeInTheDocument();
      expect(screen.queryByText('Cluster privileges required')).not.toBeInTheDocument();
    });
  });

  describe('WHEN the user cannot manage pipelines', () => {
    it('SHOULD render the missing privileges prompt with the required privileges', () => {
      renderApp(false);

      expect(screen.getByText('Cluster privileges required')).toBeInTheDocument();
      expect(
        screen.getByText(
          'To use Ingest Pipelines, you must have the manage_pipeline cluster privilege.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByTestId('pipelinesList')).not.toBeInTheDocument();
    });
  });
});

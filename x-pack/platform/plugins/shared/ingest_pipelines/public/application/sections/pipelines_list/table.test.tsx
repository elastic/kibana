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

import type { Pipeline } from '../../../../common/types';
import { PipelineTable } from './table';

const mockUsePipelinesPrivileges = jest.fn();

jest.mock('../../../shared_imports', () => ({
  ...jest.requireActual('../../../shared_imports'),
  useKibana: () => ({ services: { history: createMemoryHistory() } }),
}));

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  usePipelinesPrivileges: () => mockUsePipelinesPrivileges(),
}));

const EDIT_ACTION_LABEL = 'Edit this pipeline';

const pipelines: Pipeline[] = [
  { name: 'p1', description: '', processors: [], on_failure: [], isManaged: false },
];

const renderTable = () =>
  render(
    <I18nProvider>
      <PipelineTable
        pipelines={pipelines}
        isLoading={false}
        onReloadClick={jest.fn()}
        onEditPipelineClick={jest.fn()}
        onClonePipelineClick={jest.fn()}
        onDeletePipelineClick={jest.fn()}
        openFlyout={jest.fn()}
      />
    </I18nProvider>
  );

describe('PipelineTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN the user can manage pipelines', () => {
    beforeEach(() => {
      mockUsePipelinesPrivileges.mockReturnValue({ canRead: true, canManage: true });
    });

    it('SHOULD render row selection and pipeline actions', () => {
      renderTable();

      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText(EDIT_ACTION_LABEL).length).toBeGreaterThan(0);
    });
  });

  describe('WHEN the user can only read pipelines', () => {
    beforeEach(() => {
      mockUsePipelinesPrivileges.mockReturnValue({ canRead: true, canManage: false });
    });

    it('SHOULD not render row selection or pipeline actions', () => {
      renderTable();

      expect(screen.getByTestId('pipelinesTable')).toBeInTheDocument();
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
      expect(screen.queryAllByLabelText(EDIT_ACTION_LABEL)).toHaveLength(0);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { Pipeline } from '../../../../common/types';
import { PipelineFlyout } from './pipeline_flyout';

const mockUseKibana = jest.fn();

jest.mock('../../../shared_imports', () => ({
  ...jest.requireActual('../../../shared_imports'),
  useKibana: () => mockUseKibana(),
}));

const PIPELINE_NAME = 'my-pipeline';
const MISSING_CUSTOM_PIPELINE_NAME = 'logs@custom';

const pipeline: Pipeline = {
  name: PIPELINE_NAME,
  description: '',
  processors: [],
  on_failure: [],
  isManaged: false,
};

const notFoundError = { statusCode: 404, error: 'Not Found', message: 'Not Found' };

const renderFlyout = ({
  canManage,
  ingestPipeline = PIPELINE_NAME,
  loadPipelineResult = { data: pipeline, isLoading: false, error: null },
  onCreateClick = jest.fn(),
}: {
  canManage: boolean;
  ingestPipeline?: string;
  loadPipelineResult?: { data?: Pipeline; isLoading: boolean; error: typeof notFoundError | null };
  onCreateClick?: jest.Mock;
}) => {
  mockUseKibana.mockReturnValue({
    services: {
      api: {
        useLoadPipeline: () => loadPipelineResult,
        useLoadPipelineTree: () => ({ data: undefined }),
      },
      config: { enableManageProcessors: false, canRead: true, canManage },
    },
  });

  return render(
    <I18nProvider>
      <PipelineFlyout
        ingestPipeline={ingestPipeline}
        onClose={jest.fn()}
        onCreateClick={onCreateClick}
        onEditClick={jest.fn()}
        onCloneClick={jest.fn()}
        onDeleteClick={jest.fn()}
      />
    </I18nProvider>
  );
};

describe('PipelineFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN the pipeline exists', () => {
    describe('AND the user can manage pipelines', () => {
      it('SHOULD render the details panel actions', () => {
        renderFlyout({ canManage: true });

        expect(screen.getByTestId('detailsPanelFooter')).toBeInTheDocument();
        expect(screen.getByTestId('editPipelineButton')).toBeInTheDocument();
      });
    });

    describe('AND the user can only read pipelines', () => {
      it('SHOULD not render the details panel footer or actions', () => {
        renderFlyout({ canManage: false });

        expect(screen.getByTestId('pipelineDetails')).toBeInTheDocument();
        expect(screen.queryByTestId('detailsPanelFooter')).not.toBeInTheDocument();
        expect(screen.queryByTestId('editPipelineButton')).not.toBeInTheDocument();
      });
    });
  });

  describe('WHEN a custom pipeline does not exist', () => {
    const missingPipelineResult = { data: undefined, isLoading: false, error: notFoundError };

    describe('AND the user can manage pipelines', () => {
      it('SHOULD offer to create the pipeline', () => {
        const onCreateClick = jest.fn();
        renderFlyout({
          canManage: true,
          ingestPipeline: MISSING_CUSTOM_PIPELINE_NAME,
          loadPipelineResult: missingPipelineResult,
          onCreateClick,
        });

        expect(screen.getByTestId('missingCustomPipeline')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('createCustomPipeline'));
        expect(onCreateClick).toHaveBeenCalledWith(MISSING_CUSTOM_PIPELINE_NAME);
      });
    });

    describe('AND the user can only read pipelines', () => {
      it('SHOULD not offer to create the pipeline', () => {
        renderFlyout({
          canManage: false,
          ingestPipeline: MISSING_CUSTOM_PIPELINE_NAME,
          loadPipelineResult: missingPipelineResult,
        });

        expect(screen.getByTestId('missingCustomPipeline')).toBeInTheDocument();
        expect(screen.queryByTestId('createCustomPipeline')).not.toBeInTheDocument();
      });
    });
  });
});

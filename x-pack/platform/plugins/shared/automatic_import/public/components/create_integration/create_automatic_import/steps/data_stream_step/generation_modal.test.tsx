/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, type RenderResult, waitFor } from '@testing-library/react';
import { mockReportEvent } from '../../../../../services/telemetry/mocks/service';
import { TestProvider } from '../../../../../mocks/test_provider';
import { GenerationModal } from './generation_modal';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';
import { TelemetryEventType } from '../../../../../services/telemetry/types';
import { deepCopy } from '../../../../../../server/util/util';

const integrationSettings = mockState.integrationSettings!;
const connector = mockState.connector!;

const mockAnalyzeLogsResults = {
  parsedSamples: [{ test: 'analyzeLogsResponse' }],
  samplesFormat: { name: 'structured' },
};
const additionalProcessors = [
  {
    kv: {
      field: 'message',
      field_split: ' (?=[a-zA-Z][a-zA-Z0-9_]*=)',
      value_split: '=',
      trim_key: ' ',
      trim_value: " '",
      target_field: 'grdfg.dg',
    },
  },
];
const mockEcsMappingResults = { pipeline: { test: 'ecsMappingResponse' }, docs: [] };
const mockCategorizationResults = { pipeline: { test: 'categorizationResponse' }, docs: [] };
const mockRelatedResults = { pipeline: { test: 'relatedResponse' }, docs: [] };
const onCompleteResults = {
  pipeline: mockRelatedResults.pipeline,
  docs: mockRelatedResults.docs,
  samplesFormat: mockAnalyzeLogsResults.samplesFormat,
};
const mockRunAnalyzeLogsGraph = jest.fn((_: unknown) => ({
  results: mockAnalyzeLogsResults,
  additionalProcessors,
}));
const mockRunEcsGraph = jest.fn((_: unknown) => ({ results: mockEcsMappingResults }));
const mockRunCategorizationGraph = jest.fn((_: unknown) => ({
  results: mockCategorizationResults,
}));
const mockRunRelatedGraph = jest.fn((_: unknown) => ({ results: mockRelatedResults }));

const defaultRequest = {
  connectorId: connector.id,
  langSmithOptions: undefined,
  packageName: integrationSettings.name ?? '',
  dataStreamName: integrationSettings.dataStreamName ?? '',
};

jest.mock('../../../../../common/lib/api', () => ({
  runAnalyzeLogsGraph: (params: unknown) => mockRunAnalyzeLogsGraph(params),
  runEcsGraph: (params: unknown) => mockRunEcsGraph(params),
  runCategorizationGraph: (params: unknown) => mockRunCategorizationGraph(params),
  runRelatedGraph: (params: unknown) => mockRunRelatedGraph(params),
}));

const mockOnComplete = jest.fn();
const mockOnClose = jest.fn();

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('GenerationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when there are no errors and a Non-JSON log format', () => {
    let result: RenderResult;
    const integrationSettingsNonJSON = deepCopy(integrationSettings);
    beforeEach(async () => {
      await act(async () => {
        result = render(
          <GenerationModal
            integrationSettings={integrationSettingsNonJSON}
            connector={connector}
            onComplete={mockOnComplete}
            onClose={mockOnClose}
          />,
          { wrapper }
        );
        await waitFor(() => expect(mockOnComplete).toBeCalled());
      });
    });

    it('should render generation modal', () => {
      expect(result.queryByTestId('generationModal')).toBeInTheDocument();
    });

    it('should call runAnalyzeLogsGraph with correct parameters', () => {
      expect(mockRunAnalyzeLogsGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        packageTitle: 'Mocked Integration title',
        dataStreamTitle: 'Mocked Data Stream Title',
        logSamples: integrationSettingsNonJSON.logSamples ?? [],
      });
    });

    it('should call runEcsGraph with correct parameters', () => {
      expect(mockRunEcsGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        additionalProcessors,
        rawSamples: mockAnalyzeLogsResults.parsedSamples,
        samplesFormat: mockAnalyzeLogsResults.samplesFormat,
      });
    });

    it('should call runCategorizationGraph with correct parameters', () => {
      expect(mockRunCategorizationGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        additionalProcessors,
        currentPipeline: mockEcsMappingResults.pipeline,
        rawSamples: integrationSettingsNonJSON.logSamples,
        samplesFormat: mockAnalyzeLogsResults.samplesFormat,
      });
    });

    it('should call runRelatedGraph with correct parameters', () => {
      expect(mockRunRelatedGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        additionalProcessors,
        currentPipeline: mockCategorizationResults.pipeline,
        rawSamples: integrationSettingsNonJSON.logSamples,
        samplesFormat: mockAnalyzeLogsResults.samplesFormat,
      });
    });

    it('should call onComplete with the results', () => {
      expect(mockOnComplete).toHaveBeenCalledWith(onCompleteResults);
    });

    it('should report telemetry for generation complete', () => {
      expect(mockReportEvent).toHaveBeenCalledWith(
        TelemetryEventType.AutomaticImportGenerationComplete,
        {
          sessionId: expect.any(String),
          sampleRows: integrationSettingsNonJSON.logSamples?.length ?? 0,
          actionTypeId: connector.actionTypeId,
          model: expect.anything(),
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage: undefined,
        }
      );
    });
  });

  describe('when there are no errors and a JSON log format', () => {
    let result: RenderResult;
    const integrationSettingsJSON = deepCopy(integrationSettings);
    integrationSettingsJSON.samplesFormat = { name: 'json' };
    const onCompleteResultsJSON = deepCopy(onCompleteResults);
    onCompleteResultsJSON.samplesFormat = integrationSettingsJSON.samplesFormat;
    beforeEach(async () => {
      await act(async () => {
        result = render(
          <GenerationModal
            integrationSettings={integrationSettingsJSON}
            connector={connector}
            onComplete={mockOnComplete}
            onClose={mockOnClose}
          />,
          { wrapper }
        );
        await waitFor(() => expect(mockOnComplete).toBeCalled());
      });
    });

    it('should render generation modal', () => {
      expect(result.queryByTestId('generationModal')).toBeInTheDocument();
    });

    it('should call runEcsGraph with correct parameters', () => {
      expect(mockRunEcsGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        additionalProcessors: [],
        rawSamples: integrationSettingsJSON.logSamples,
        samplesFormat: integrationSettingsJSON.samplesFormat,
      });
    });

    it('should call runCategorizationGraph with correct parameters', () => {
      expect(mockRunCategorizationGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        additionalProcessors: [],
        currentPipeline: mockEcsMappingResults.pipeline,
        rawSamples: integrationSettingsJSON.logSamples,
        samplesFormat: integrationSettingsJSON.samplesFormat,
      });
    });

    it('should call runRelatedGraph with correct parameters', () => {
      expect(mockRunRelatedGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        additionalProcessors: [],
        currentPipeline: mockCategorizationResults.pipeline,
        rawSamples: integrationSettingsJSON.logSamples,
        samplesFormat: integrationSettingsJSON.samplesFormat,
      });
    });

    it('should call onComplete with the results', () => {
      expect(mockOnComplete).toHaveBeenCalledWith(onCompleteResultsJSON);
    });

    it('should report telemetry for generation complete', () => {
      expect(mockReportEvent).toHaveBeenCalledWith(
        TelemetryEventType.AutomaticImportGenerationComplete,
        {
          sessionId: expect.any(String),
          sampleRows: integrationSettings.logSamples?.length ?? 0,
          actionTypeId: connector.actionTypeId,
          model: expect.anything(),
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage: undefined,
        }
      );
    });
  });

  describe('when there are errors', () => {
    const errorMessage = 'error message';
    let result: RenderResult;
    beforeEach(async () => {
      mockRunEcsGraph.mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      await act(async () => {
        result = render(
          <GenerationModal
            integrationSettings={integrationSettings}
            connector={connector}
            onComplete={mockOnComplete}
            onClose={mockOnClose}
          />,
          { wrapper }
        );
        await waitFor(() =>
          expect(result.queryByTestId('generationErrorCallout')).toBeInTheDocument()
        );
      });
    });

    it('should show the error text', () => {
      expect(result.queryByText(errorMessage)).toBeInTheDocument();
    });
    it('should render the retry button', () => {
      expect(result.queryByTestId('retryButton')).toBeInTheDocument();
    });
    it('should report telemetry for generation error', () => {
      expect(mockReportEvent).toHaveBeenCalledWith(
        TelemetryEventType.AutomaticImportGenerationComplete,
        {
          sessionId: expect.any(String),
          sampleRows: integrationSettings.logSamples?.length ?? 0,
          actionTypeId: connector.actionTypeId,
          model: expect.anything(),
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage,
        }
      );
    });

    describe('when retrying successfully', () => {
      beforeEach(async () => {
        await act(async () => {
          result.getByTestId('retryButton').click();
          await waitFor(() => expect(mockOnComplete).toBeCalled());
        });
      });

      it('should not render the error callout', () => {
        expect(result.queryByTestId('generationErrorCallout')).not.toBeInTheDocument();
      });
      it('should not render the retry button', () => {
        expect(result.queryByTestId('retryButton')).not.toBeInTheDocument();
      });
    });
  });

  describe('when there are errors and a message body with error code', () => {
    const errorMessage = 'error message';
    const errorCode = 'error code';
    const error = JSON.stringify({
      body: {
        message: errorMessage,
        attributes: {
          errorCode,
        },
      },
    });
    let result: RenderResult;
    beforeEach(async () => {
      mockRunEcsGraph.mockImplementationOnce(() => {
        throw new Error(error);
      });

      await act(async () => {
        result = render(
          <GenerationModal
            integrationSettings={integrationSettings}
            connector={connector}
            onComplete={mockOnComplete}
            onClose={mockOnClose}
          />,
          { wrapper }
        );
        await waitFor(() =>
          expect(result.queryByTestId('generationErrorCallout')).toBeInTheDocument()
        );
      });
    });

    it('should show the error text', () => {
      expect(result.queryByText(error)).toBeInTheDocument();
    });
    it('should render the retry button', () => {
      expect(result.queryByTestId('retryButton')).toBeInTheDocument();
    });
    it('should report telemetry for generation error', () => {
      expect(mockReportEvent).toHaveBeenCalledWith(
        TelemetryEventType.AutomaticImportGenerationComplete,
        {
          sessionId: expect.any(String),
          sampleRows: integrationSettings.logSamples?.length ?? 0,
          actionTypeId: connector.actionTypeId,
          model: expect.anything(),
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage: error,
        }
      );
    });

    describe('when retrying successfully', () => {
      beforeEach(async () => {
        await act(async () => {
          result.getByTestId('retryButton').click();
          await waitFor(() => expect(mockOnComplete).toBeCalled());
        });
      });

      it('should not render the error callout', () => {
        expect(result.queryByTestId('generationErrorCallout')).not.toBeInTheDocument();
      });
      it('should not render the retry button', () => {
        expect(result.queryByTestId('retryButton')).not.toBeInTheDocument();
      });
    });
  });
});

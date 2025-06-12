/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { TestProvider } from '../../../mocks/test_provider';
import type { State } from './state';
import { mockReportEvent } from '../../../services/telemetry/mocks/service';
import { TelemetryEventType } from '../../../services/telemetry/types';
import { CreateAutomaticImport } from './create_automatic_import';

export const defaultInitialState: State = {
  step: 1,
  connector: undefined,
  integrationSettings: undefined,
  isGenerating: false,
  result: undefined,
  showCelCreateFlyout: false,
  isFlyoutGenerating: false,
};

const mockInitialState = jest.fn((): State => defaultInitialState);
jest.mock('./state', () => ({
  ...jest.requireActual('./state'),
  get initialState() {
    return mockInitialState();
  },
}));

const mockConnectorStep = jest.fn(() => <div data-test-subj="connectorStepMock" />);
const mockIntegrationStep = jest.fn(() => <div data-test-subj="integrationStepMock" />);
const mockDataStreamStep = jest.fn(() => <div data-test-subj="dataStreamStepMock" />);
const mockCelCreateFlyout = jest.fn(() => <div data-test-subj="celCreateFlyoutMock" />);
const mockReviewStep = jest.fn(() => <div data-test-subj="reviewStepMock" />);
const mockDeployStep = jest.fn(() => <div data-test-subj="deployStepMock" />);

const mockIsConnectorStepReadyToComplete = jest.fn();
const mockIsIntegrationStepReadyToComplete = jest.fn();
const mockIsDataStreamStepReadyToComplete = jest.fn();
const mockIsReviewStepReadyToComplete = jest.fn();

jest.mock('./steps/connector_step', () => ({
  ConnectorStep: () => mockConnectorStep(),
  isConnectorStepReadyToComplete: () => mockIsConnectorStepReadyToComplete(),
}));
jest.mock('./steps/integration_step', () => ({
  IntegrationStep: () => mockIntegrationStep(),
  isIntegrationStepReadyToComplete: () => mockIsIntegrationStepReadyToComplete(),
}));
jest.mock('./steps/data_stream_step', () => ({
  DataStreamStep: () => mockDataStreamStep(),
  isDataStreamStepReadyToComplete: () => mockIsDataStreamStepReadyToComplete(),
}));
jest.mock('./flyout/cel_configuration', () => ({
  CreateCelConfigFlyout: () => mockCelCreateFlyout(),
}));
jest.mock('./steps/review_step', () => ({
  ReviewStep: () => mockReviewStep(),
  isReviewStepReadyToComplete: () => mockIsReviewStepReadyToComplete(),
}));
jest.mock('./steps/deploy_step', () => ({ DeployStep: () => mockDeployStep() }));

const mockNavigate = jest.fn();
jest.mock('../../../common/hooks/use_navigate', () => ({
  ...jest.requireActual('../../../common/hooks/use_navigate'),
  useNavigate: () => mockNavigate,
}));

const renderAutomaticImport = () => render(<CreateAutomaticImport />, { wrapper: TestProvider });

describe('CreateIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when step is 1', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 1 });
    });

    it('shoud report telemetry for assistant open', () => {
      renderAutomaticImport();
      expect(mockReportEvent).toHaveBeenCalledWith(TelemetryEventType.AutomaticImportOpen, {
        sessionId: expect.any(String),
      });
    });

    it('should render connector step', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('connectorStepMock')).toBeInTheDocument();
    });

    it('should call isConnectorStepReadyToComplete', () => {
      renderAutomaticImport();
      expect(mockIsConnectorStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show "Next" on the next button', () => {
      const result = renderAutomaticImport();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Next');
    });

    describe('when connector step is not done', () => {
      beforeEach(() => {
        mockIsConnectorStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when connector step is done', () => {
      beforeEach(() => {
        mockIsConnectorStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderAutomaticImport();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for connector step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.AutomaticImportStepComplete,
            {
              sessionId: expect.any(String),
              step: 1,
              stepName: 'Connector Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });
      });
    });

    describe('when back button is clicked', () => {
      let result: ReturnType<typeof renderAutomaticImport>;
      beforeEach(() => {
        result = renderAutomaticImport();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should navigate to the landing page', () => {
        expect(mockNavigate).toHaveBeenCalledWith('landing');
      });
    });
  });

  describe('when step is 2', () => {
    beforeEach(() => {
      mockIsConnectorStepReadyToComplete.mockReturnValue(true);
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 2 });
    });

    it('should render integration', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('integrationStepMock')).toBeInTheDocument();
    });

    it('should call isIntegrationStepReadyToComplete', () => {
      renderAutomaticImport();
      expect(mockIsIntegrationStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show "Next" on the next button', () => {
      const result = renderAutomaticImport();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Next');
    });

    describe('when integration step is not done', () => {
      beforeEach(() => {
        mockIsIntegrationStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when integration step is done', () => {
      beforeEach(() => {
        mockIsIntegrationStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderAutomaticImport();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for integration step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.AutomaticImportStepComplete,
            {
              sessionId: expect.any(String),
              step: 2,
              stepName: 'Integration Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });
      });
    });

    describe('when back button is clicked', () => {
      let result: ReturnType<typeof renderAutomaticImport>;
      beforeEach(() => {
        result = renderAutomaticImport();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should show connector step', () => {
        expect(result.queryByTestId('connectorStepMock')).toBeInTheDocument();
      });

      it('should enable the next button', () => {
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });
    });
  });

  describe('when step is 3', () => {
    beforeEach(() => {
      mockIsConnectorStepReadyToComplete.mockReturnValue(true);
      mockIsIntegrationStepReadyToComplete.mockReturnValue(true);
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 3 });
    });

    it('should render data stream', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('dataStreamStepMock')).toBeInTheDocument();
    });

    it('should call isDataStreamStepReadyToComplete', () => {
      renderAutomaticImport();
      expect(mockIsDataStreamStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show "Analyze logs" on the next button', () => {
      const result = renderAutomaticImport();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Analyze logs');
    });

    describe('when data stream step is not done', () => {
      beforeEach(() => {
        mockIsDataStreamStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when data stream step is done', () => {
      beforeEach(() => {
        mockIsDataStreamStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderAutomaticImport();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for data stream step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.AutomaticImportStepComplete,
            {
              sessionId: expect.any(String),
              step: 3,
              stepName: 'DataStream Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });

        it('should show loader on the next button', () => {
          const result = renderAutomaticImport();
          expect(result.getByTestId('generatingLoader')).toBeInTheDocument();
        });

        it('should disable the next button', () => {
          const result = renderAutomaticImport();
          // Not sure why there are two buttons when testing.
          const nextButton = result
            .getAllByTestId('buttonsFooter-nextButton')
            .filter((button) => button.textContent !== 'Next')[0];
          expect(nextButton).toBeDisabled();
        });
      });
    });

    describe('when back button is clicked', () => {
      let result: ReturnType<typeof renderAutomaticImport>;
      beforeEach(() => {
        result = renderAutomaticImport();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should show integration step', () => {
        expect(result.queryByTestId('integrationStepMock')).toBeInTheDocument();
      });

      it('should enable the next button', () => {
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });
    });
  });

  describe('when step is 3 and showCelCreateFlyout=true', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({
        ...defaultInitialState,
        step: 3,
        showCelCreateFlyout: true,
      });
    });

    it('should render cel creation flyout', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('celCreateFlyoutMock')).toBeInTheDocument();
    });
  });

  describe('when step is 4', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 4 });
    });

    it('should render review', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('reviewStepMock')).toBeInTheDocument();
    });

    it('should call isReviewStepReadyToComplete', () => {
      renderAutomaticImport();
      expect(mockIsReviewStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show the "Add to Elastic" on the next button', () => {
      const result = renderAutomaticImport();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Add to Elastic');
    });

    describe('when review step is not done', () => {
      beforeEach(() => {
        mockIsReviewStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when review step is done', () => {
      beforeEach(() => {
        mockIsReviewStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderAutomaticImport();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderAutomaticImport();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for review step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.AutomaticImportStepComplete,
            {
              sessionId: expect.any(String),
              step: 4,
              stepName: 'Review Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });

        it('should show deploy step', () => {
          const result = renderAutomaticImport();
          expect(result.queryByTestId('deployStepMock')).toBeInTheDocument();
        });

        it('should enable the next button', () => {
          const result = renderAutomaticImport();
          expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
        });
      });
    });
  });

  describe('when step is 5', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 5 });
    });

    it('should render deploy', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('deployStepMock')).toBeInTheDocument();
    });

    it('should hide the back button', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should hide the next button', () => {
      const result = renderAutomaticImport();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should enable the cancel button', () => {
      const result = renderAutomaticImport();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
    });

    it('should show "Close" on the cancel button', () => {
      const result = renderAutomaticImport();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toHaveTextContent('Close');
    });
  });
});

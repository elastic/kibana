/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, type RenderResult, waitFor } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { DeployStep } from './deploy_step';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';
import type { BuildIntegrationRequestBody } from '../../../../../../common';
import { mockReportEvent } from '../../../../../services/telemetry/mocks/service';
import { TelemetryEventType } from '../../../../../services/telemetry/types';

const integrationSettings = mockState.integrationSettings!;
const connector = mockState.connector!;
const results = mockState.result!;

const parameters: BuildIntegrationRequestBody = {
  integration: {
    title: integrationSettings.title!,
    description: integrationSettings.description!,
    name: integrationSettings.name!,
    logo: integrationSettings.logo,
    dataStreams: [
      {
        title: integrationSettings.dataStreamTitle!,
        description: integrationSettings.dataStreamDescription!,
        name: integrationSettings.dataStreamName!,
        inputTypes: integrationSettings.inputTypes!,
        rawSamples: integrationSettings.logSamples!,
        docs: results.docs!,
        pipeline: results.pipeline,
        samplesFormat: results.samplesFormat!,
      },
    ],
  },
};

const builtIntegration = new Blob();
const mockRunBuildIntegration = jest.fn((_: unknown) => builtIntegration);
const integrationName = 'my_integration_33-1.0.0';
const mockRunInstallPackage = jest.fn((_: unknown) => ({
  items: [{ id: 'audit-my_integration_33.data-stream-1.0.0', type: 'ingest_pipeline' }],
}));
jest.mock('../../../../../common/lib/api', () => ({
  runBuildIntegration: (params: unknown) => mockRunBuildIntegration(params),
  runInstallPackage: (params: unknown) => mockRunInstallPackage(params),
}));

const mockSaveAs = jest.fn();
jest.mock('@elastic/filesaver', () => ({
  saveAs: (...params: unknown[]) => mockSaveAs(...params),
}));

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('DeployStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when deploy is successful', () => {
    let result: RenderResult;
    beforeEach(async () => {
      await act(async () => {
        result = render(
          <DeployStep
            integrationSettings={integrationSettings}
            connector={connector}
            result={results}
          />,
          { wrapper }
        );
        await waitFor(() => expect(result.queryByTestId('deployStep-loading')).toBeInTheDocument());
        await waitFor(() =>
          expect(result.queryByTestId('deployStep-loading')).not.toBeInTheDocument()
        );
      });
    });

    it('should call build integration api', () => {
      expect(mockRunBuildIntegration).toHaveBeenCalledWith(parameters);
    });

    it('should call install package api', () => {
      expect(mockRunInstallPackage).toHaveBeenCalledWith(builtIntegration);
    });

    it('should render success deploy message', () => {
      expect(result.queryByTestId('deployStep-success')).toBeInTheDocument();
    });

    it('should report telemetry for integration complete', () => {
      expect(mockReportEvent).toHaveBeenCalledWith(TelemetryEventType.AutomaticImportComplete, {
        sessionId: expect.any(String),
        integrationName,
        integrationDescription: integrationSettings.description,
        dataStreamName: integrationSettings.dataStreamName,
        inputTypes: integrationSettings.inputTypes,
        model: expect.any(String),
        actionTypeId: connector.actionTypeId,
        provider: connector.apiProvider ?? 'unknown',
        durationMs: expect.any(Number),
        errorMessage: undefined,
      });
    });

    it('should render the save button', () => {
      expect(result.queryByTestId('saveZipButton')).toBeInTheDocument();
    });

    describe('when save button is clicked', () => {
      beforeEach(() => {
        result.getByTestId('saveZipButton').click();
      });

      it('should save file', () => {
        expect(mockSaveAs).toHaveBeenCalledWith(builtIntegration, `${integrationName}.zip`);
      });
    });
  });

  describe('when deploy fails', () => {
    describe('when build integration throws errors', () => {
      const errorMessage = 'build integration failed';
      let result: RenderResult;
      beforeEach(async () => {
        mockRunBuildIntegration.mockImplementationOnce(() => {
          throw new Error(errorMessage);
        });
        await act(async () => {
          result = render(
            <DeployStep
              integrationSettings={integrationSettings}
              connector={connector}
              result={results}
            />,
            { wrapper }
          );
          await waitFor(() => expect(result.queryByTestId('deployStep-error')).toBeInTheDocument());
        });
      });

      it('should not render success deploy message', () => {
        expect(result.queryByTestId('deployStep-success')).not.toBeInTheDocument();
      });

      it('should render the error message', () => {
        expect(result.queryByTestId('deployStep-error')).toBeInTheDocument();
        expect(result.queryByText(errorMessage)).toBeInTheDocument();
      });

      it('should not render the save button', () => {
        expect(result.queryByTestId('saveZipButton')).not.toBeInTheDocument();
      });

      it('should report telemetry for integration complete with error', () => {
        expect(mockReportEvent).toHaveBeenCalledWith(TelemetryEventType.AutomaticImportComplete, {
          sessionId: expect.any(String),
          integrationName: integrationSettings.name,
          integrationDescription: integrationSettings.description,
          dataStreamName: integrationSettings.dataStreamName,
          inputTypes: integrationSettings.inputTypes,
          model: expect.any(String),
          actionTypeId: connector.actionTypeId,
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage,
        });
      });
    });

    describe('when install integration throws errors', () => {
      const errorMessage = 'install integration failed';
      let result: RenderResult;
      beforeEach(async () => {
        mockRunInstallPackage.mockImplementationOnce(() => {
          throw new Error(errorMessage);
        });
        await act(async () => {
          result = render(
            <DeployStep
              integrationSettings={integrationSettings}
              connector={connector}
              result={results}
            />,
            { wrapper }
          );
          await waitFor(() => expect(result.queryByTestId('deployStep-error')).toBeInTheDocument());
        });
      });

      it('should not render success deploy message', () => {
        expect(result.queryByTestId('deployStep-success')).not.toBeInTheDocument();
      });

      it('should render the error message', () => {
        expect(result.queryByTestId('deployStep-error')).toBeInTheDocument();
        expect(result.queryByText(errorMessage)).toBeInTheDocument();
      });

      it('should not render the save button', () => {
        expect(result.queryByTestId('saveZipButton')).not.toBeInTheDocument();
      });

      it('should report telemetry for integration complete with error', () => {
        expect(mockReportEvent).toHaveBeenCalledWith(TelemetryEventType.AutomaticImportComplete, {
          sessionId: expect.any(String),
          integrationName: integrationSettings.name,
          integrationDescription: integrationSettings.description,
          dataStreamName: integrationSettings.dataStreamName,
          inputTypes: integrationSettings.inputTypes,
          model: expect.any(String),
          actionTypeId: connector.actionTypeId,
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage,
        });
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react';
import { TestProvider } from '../../../../../../../mocks/test_provider';
import { ActionsProvider } from '../../../../state';
import { mockActions, mockState } from '../../../../mocks/state';
import { UploadSpecStep } from './upload_spec_step';

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('UploadSpecStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when open with initial state', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <UploadSpecStep
          integrationSettings={undefined}
          connector={mockState.connector}
          isFlyoutGenerating={false}
          showValidation={false}
          onShowValidation={() => {}}
          onUpdateValidation={() => {}}
          onUpdateNeedsGeneration={() => {}}
          onAnalyzeApiGenerationComplete={() => {}}
        />,
        { wrapper }
      );
    });

    it('should render upload spec step', () => {
      expect(result.queryByTestId('dataStreamTitleInput')).toBeInTheDocument();
      expect(result.queryByTestId('apiDefinitionFilePicker')).toBeInTheDocument();
    });

    it('analyze button enabled', () => {
      expect(result.queryByTestId('analyzeApiButton')).toBeEnabled();
    });
  });

  describe('when opened and validation enabled (clicking submit before filling out the fields)', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <UploadSpecStep
          integrationSettings={undefined}
          connector={mockState.connector}
          isFlyoutGenerating={false}
          showValidation={true}
          onShowValidation={() => {}}
          onUpdateValidation={() => {}}
          onUpdateNeedsGeneration={() => {}}
          onAnalyzeApiGenerationComplete={() => {}}
        />,
        { wrapper }
      );
    });

    it('analyze button disabled', () => {
      expect(result.queryByTestId('analyzeApiButton')).toBeDisabled();
    });

    describe('fills in fields', () => {
      beforeEach(async () => {
        await act(async () => {
          fireEvent.change(result.getByTestId('dataStreamTitleInput'), {
            target: { value: 'testDataStreamTitle' },
          });
          const filepicker = result.getByTestId('apiDefinitionFilePicker');
          fireEvent.change(filepicker, {
            target: { files: [new File(['...'], 'test.json', { type: 'application/json' })] },
          });
          await waitFor(() => expect(filepicker).toHaveAttribute('data-loading', 'true'));
          await waitFor(() => expect(filepicker).toHaveAttribute('data-loading', 'false'));
        });
      });

      it('analyze button re-enabled', () => {
        expect(result.queryByTestId('analyzeApiButton')).toBeEnabled();
      });
    });
  });

  describe('analyzing in progress', () => {
    let result: RenderResult;
    beforeEach(() => {
      jest.clearAllMocks();
      result = render(
        <UploadSpecStep
          integrationSettings={undefined}
          connector={mockState.connector}
          isFlyoutGenerating={true}
          showValidation={false}
          onShowValidation={() => {}}
          onUpdateValidation={() => {}}
          onUpdateNeedsGeneration={() => {}}
          onAnalyzeApiGenerationComplete={() => {}}
        />,
        { wrapper }
      );
    });

    it('form is disabled', () => {
      expect(result.queryByTestId('dataStreamTitleInput')).toBeDisabled();
    });

    it('analyze button disabled; cancel button appears and is enabled', () => {
      expect(result.queryByTestId('analyzeApiButton')).toBeDisabled();
      expect(result.queryByTestId('cancelAnalyzeApiButton')).toBeVisible();
    });
  });
});

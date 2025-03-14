/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, type RenderResult, fireEvent, waitFor } from '@testing-library/react';
import { TestProvider } from '../../../../../mocks/test_provider';
import { ReviewStep } from './review_step';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';

const integrationSettings = mockState.integrationSettings!;
const results = mockState.result!;

const mockResults = {
  pipeline: { test: 'checkPipelineResponse' },
  docs: [{ id: 'testDoc' }],
};
const customPipeline = {
  ...mockResults.pipeline,
  description: 'testing',
};
const defaultRequest = {
  pipeline: customPipeline,
  rawSamples: integrationSettings.logSamples!,
};
const mockRunCheckPipelineResults = jest.fn((_: unknown) => ({ results: mockResults }));
jest.mock('../../../../../common/lib/api', () => ({
  runCheckPipelineResults: (params: unknown) => mockRunCheckPipelineResults(params),
}));
jest.mock('@kbn/code-editor', () => ({
  ...jest.requireActual('@kbn/code-editor'),
  CodeEditor: (props: { value: string; onChange: Function }) => (
    <input
      data-test-subj={'mockCodeEditor'}
      value={props.value}
      onChange={(e) => {
        props.onChange(e.target.value);
      }}
    />
  ),
}));

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('ReviewStep', () => {
  let result: RenderResult;
  beforeEach(() => {
    jest.clearAllMocks();
    result = render(
      <ReviewStep
        integrationSettings={integrationSettings}
        isGenerating={false}
        result={results}
      />,
      { wrapper }
    );
  });

  it('should render integration step page', () => {
    expect(result.queryByTestId('reviewStep')).toBeInTheDocument();
  });

  describe('when edit pipeline button is clicked', () => {
    beforeEach(() => {
      act(() => {
        result.getByTestId('editPipelineButton').click();
      });
    });

    it('should open pipeline editor', () => {
      expect(result.queryByTestId('mockCodeEditor')).toBeInTheDocument();
    });

    describe('when saving pipeline without changes', () => {
      beforeEach(() => {
        act(() => {
          result.getByTestId('savePipelineButton').click();
        });
      });

      it('should call setResults', () => {
        expect(mockActions.setResult).not.toHaveBeenCalled();
      });
    });

    describe('when saving pipeline with changes', () => {
      beforeEach(async () => {
        act(() => {
          fireEvent.change(result.getByTestId('mockCodeEditor'), {
            target: { value: JSON.stringify(customPipeline) },
          });
        });
      });

      describe('when check pipeline is successful', () => {
        beforeEach(async () => {
          await act(async () => {
            result.getByTestId('savePipelineButton').click();
            await waitFor(() => expect(mockActions.setIsGenerating).toHaveBeenCalledWith(false));
          });
        });

        it('should call setIsGenerating', () => {
          expect(mockActions.setIsGenerating).toHaveBeenCalledWith(true);
        });

        it('should check pipeline', () => {
          expect(mockRunCheckPipelineResults).toHaveBeenCalledWith(defaultRequest);
        });

        it('should call setResults', () => {
          expect(mockActions.setResult).toHaveBeenCalledWith({
            ...mockResults,
            pipeline: customPipeline,
          });
        });
      });

      describe('when check pipeline fails', () => {
        beforeEach(async () => {
          mockRunCheckPipelineResults.mockImplementationOnce(() => {
            throw new Error('test error');
          });
          await act(async () => {
            result.getByTestId('savePipelineButton').click();
            await waitFor(() => expect(mockActions.setIsGenerating).toHaveBeenCalledWith(false));
          });
        });

        it('should check pipeline', () => {
          expect(mockRunCheckPipelineResults).toHaveBeenCalledWith(defaultRequest);
        });

        it('should not call setResults', () => {
          expect(mockActions.setResult).not.toHaveBeenCalled();
        });

        it('should show error', () => {
          expect(result.queryByText('Error: test error')).toBeInTheDocument();
        });
      });

      describe('when check pipeline has no docs', () => {
        beforeEach(async () => {
          mockRunCheckPipelineResults.mockReturnValueOnce({
            results: { ...mockResults, docs: [] },
          });
          await act(async () => {
            result.getByTestId('savePipelineButton').click();
            await waitFor(() => expect(mockActions.setIsGenerating).toHaveBeenCalledWith(false));
          });
        });

        it('should check pipeline', () => {
          expect(mockRunCheckPipelineResults).toHaveBeenCalledWith(defaultRequest);
        });

        it('should not call setResults', () => {
          expect(mockActions.setResult).not.toHaveBeenCalled();
        });

        it('should show error', () => {
          expect(result.queryByText('No results for the pipeline')).toBeInTheDocument();
        });
      });
    });
  });
});

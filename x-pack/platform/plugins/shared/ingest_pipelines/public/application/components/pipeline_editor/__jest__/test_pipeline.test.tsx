/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pipeline } from '../../../../../common/types';
import { API_BASE_PATH } from '../../../../../common/constants';

import type { VerboseTestOutput, Document } from '../types';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderTestPipeline, setupEnvironment } from './test_pipeline.helpers';
import { DOCUMENTS, SIMULATE_RESPONSE, PROCESSORS } from './constants';

interface ReqBody {
  documents: Document[];
  verbose?: boolean;
  pipeline: Pick<Pipeline, 'processors' | 'on_failure'>;
}

const hasStringBody = (value: unknown): value is { body: string } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'body' in value &&
    typeof (value as { body?: unknown }).body === 'string'
  );
};

describe('Test pipeline', () => {
  let onUpdate: jest.Mock;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  // This is a hack
  // We need to provide the processor id in the mocked output;
  // this is generated dynamically
  // As a workaround, the value is added as a data attribute in the UI
  // and we retrieve it to generate the mocked output.
  const addProcessorTagtoMockOutput = (output: VerboseTestOutput) => {
    const docs = output.docs.map((doc) => {
      const results = doc.processor_results.map((result, index) => {
        const tag = screen.getByTestId(`processors>${index}`).getAttribute('data-processor-id');
        return {
          ...result,
          tag,
        };
      });
      return { processor_results: results };
    });
    return { docs };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    onUpdate = jest.fn();

    ({ httpSetup, httpRequestsMockHelpers } = setupEnvironment());
    renderTestPipeline(httpSetup, {
      value: {
        ...PROCESSORS,
      },
      onFlyoutOpen: jest.fn(),
      onUpdate,
    });
  });

  describe('Test pipeline actions', () => {
    it('should successfully add sample documents and execute the pipeline', async () => {
      const postMock = jest.mocked(httpSetup.post);

      httpRequestsMockHelpers.setSimulatePipelineResponse(SIMULATE_RESPONSE);

      // Flyout and document dropdown should not be visible
      expect(screen.queryByTestId('testPipelineFlyout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('documentsDropdown')).not.toBeInTheDocument();

      // Open flyout
      fireEvent.click(screen.getByTestId('addDocumentsButton'));
      await screen.findByTestId('testPipelineFlyout');

      // Flyout should be visible with output tab initially disabled
      expect(screen.getByTestId('documentsTabContent')).toBeInTheDocument();
      expect(screen.queryByTestId('outputTabContent')).not.toBeInTheDocument();

      // Add sample documents and click run
      fireEvent.change(screen.getByTestId('documentsEditor'), {
        target: { value: JSON.stringify(DOCUMENTS) },
      });

      const runCallsBefore = postMock.mock.calls.length;
      fireEvent.click(screen.getByTestId('runPipelineButton'));
      await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(runCallsBefore));

      // Verify request
      const latestRequest = postMock.mock.calls[postMock.mock.calls.length - 1];
      const requestOptions: unknown = latestRequest?.[1];
      if (!hasStringBody(requestOptions)) {
        throw new Error('Expected simulate request body to be a string');
      }

      const requestBody: ReqBody = JSON.parse(requestOptions.body);

      const {
        documents: reqDocuments,
        verbose: reqVerbose,
        pipeline: { processors: reqProcessors },
      } = requestBody;

      expect(reqDocuments).toEqual(DOCUMENTS);
      expect(reqVerbose).toEqual(true);

      // We programatically add a unique tag field when calling the simulate API
      // We do not know this value in the test, so we simply check that the field exists
      // and only verify the processor configuration
      reqProcessors.forEach((processor, index) => {
        Object.entries(processor).forEach(([key, value]) => {
          const { tag, ...config } = value;
          expect(tag).toBeDefined();
          expect(config).toEqual(PROCESSORS.processors[index][key]);
        });
      });

      await screen.findByTestId('outputTabContent');

      // Verify output tab is active
      expect(screen.queryByTestId('documentsTabContent')).not.toBeInTheDocument();
      expect(screen.getByTestId('outputTabContent')).toBeInTheDocument();

      // Click reload button and verify request
      const refreshCallsBefore = postMock.mock.calls.length;
      fireEvent.click(screen.getByTestId('refreshOutputButton'));
      await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(refreshCallsBefore));

      // Click verbose toggle and verify request
      const verboseCallsBefore = postMock.mock.calls.length;
      fireEvent.click(screen.getByTestId('verboseOutputToggle'));
      await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(verboseCallsBefore));
      expect(postMock).toHaveBeenLastCalledWith(`${API_BASE_PATH}/simulate`, expect.anything());
    });

    test('should enable the output tab if cached documents exist', async () => {
      const postMock = jest.mocked(httpSetup.post);

      httpRequestsMockHelpers.setSimulatePipelineResponse(SIMULATE_RESPONSE);

      // Open flyout
      fireEvent.click(screen.getByTestId('addDocumentsButton'));
      await screen.findByTestId('testPipelineFlyout');

      // Add sample documents and click run
      fireEvent.change(screen.getByTestId('documentsEditor'), {
        target: { value: JSON.stringify(DOCUMENTS) },
      });
      const runCallsBefore = postMock.mock.calls.length;
      fireEvent.click(screen.getByTestId('runPipelineButton'));
      await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(runCallsBefore));
      await screen.findByTestId('outputTabContent');

      // Close flyout
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
      await waitFor(() =>
        expect(screen.queryByTestId('testPipelineFlyout')).not.toBeInTheDocument()
      );
      expect(screen.queryByTestId('addDocumentsButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('documentsDropdown')).toBeInTheDocument();

      // Reopen flyout and verify output tab is enabled
      fireEvent.click(screen.getByTestId('viewOutputButton'));
      await screen.findByTestId('testPipelineFlyout');
      expect(screen.queryByTestId('documentsTabContent')).not.toBeInTheDocument();
      expect(screen.getByTestId('outputTabContent')).toBeInTheDocument();
    });

    test('should surface API errors from the request', async () => {
      const postMock = jest.mocked(httpSetup.post);

      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setSimulatePipelineResponse(undefined, error);

      // Open flyout
      fireEvent.click(screen.getByTestId('addDocumentsButton'));
      await screen.findByTestId('testPipelineFlyout');

      // Add invalid sample documents array and run the pipeline
      fireEvent.change(screen.getByTestId('documentsEditor'), {
        target: {
          value: JSON.stringify([
            {
              _index: 'test',
              _id: '1',
              _version: 1,
              _seq_no: 0,
              _primary_term: 1,
              _source: {
                name: 'John Doe',
              },
            },
          ]),
        },
      });
      const runCallsBefore = postMock.mock.calls.length;
      fireEvent.click(screen.getByTestId('runPipelineButton'));
      await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(runCallsBefore));

      // Verify error rendered
      const executionError = await screen.findByTestId('pipelineExecutionError');
      expect(executionError).toHaveTextContent(error.message);
    });

    describe('Add indexed documents', () => {
      test('should successfully add an indexed document', async () => {
        const getMock = jest.mocked(httpSetup.get);

        const { _index: index, _id: documentId } = DOCUMENTS[0];

        httpRequestsMockHelpers.setFetchDocumentsResponse(index, documentId, DOCUMENTS[0]);

        // Open flyout
        fireEvent.click(screen.getByTestId('addDocumentsButton'));
        await screen.findByTestId('testPipelineFlyout');

        // Open documents accordion, click run without required fields, and verify error messages
        fireEvent.click(screen.getByTestId('addDocumentsAccordion'));
        fireEvent.click(screen.getByTestId('addDocumentButton'));
        expect(await screen.findByText('An index name is required.')).toBeInTheDocument();
        expect(screen.getByText('A document ID is required.')).toBeInTheDocument();

        // Add required fields, and click run
        fireEvent.change(within(screen.getByTestId('indexField')).getByTestId('input'), {
          target: { value: index },
        });
        fireEvent.blur(within(screen.getByTestId('indexField')).getByTestId('input'));
        fireEvent.change(within(screen.getByTestId('idField')).getByTestId('input'), {
          target: { value: documentId },
        });
        fireEvent.blur(within(screen.getByTestId('idField')).getByTestId('input'));

        const getCallsBefore = getMock.mock.calls.length;
        fireEvent.click(screen.getByTestId('addDocumentButton'));
        await waitFor(() => expect(getMock.mock.calls.length).toBeGreaterThan(getCallsBefore));

        // Verify request
        expect(getMock).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/documents/${index}/${documentId}`,
          expect.anything()
        );
        // Verify success callout
        expect(await screen.findByTestId('addDocumentSuccess')).toBeInTheDocument();
      });

      test('should surface API errors from the request', async () => {
        const getMock = jest.mocked(httpSetup.get);

        const nonExistentDoc = {
          index: 'foo',
          id: '1',
        };

        const error = {
          statusCode: 404,
          error: 'Not found',
          message: '[index_not_found_exception] no such index',
        };

        httpRequestsMockHelpers.setFetchDocumentsResponse(
          nonExistentDoc.index,
          nonExistentDoc.id,
          undefined,
          error
        );

        // Open flyout
        fireEvent.click(screen.getByTestId('addDocumentsButton'));
        await screen.findByTestId('testPipelineFlyout');

        // Open documents accordion, add required fields, and click run
        fireEvent.click(screen.getByTestId('addDocumentsAccordion'));
        fireEvent.change(within(screen.getByTestId('indexField')).getByTestId('input'), {
          target: { value: nonExistentDoc.index },
        });
        fireEvent.blur(within(screen.getByTestId('indexField')).getByTestId('input'));
        fireEvent.change(within(screen.getByTestId('idField')).getByTestId('input'), {
          target: { value: nonExistentDoc.id },
        });
        fireEvent.blur(within(screen.getByTestId('idField')).getByTestId('input'));

        const getCallsBefore = getMock.mock.calls.length;
        fireEvent.click(screen.getByTestId('addDocumentButton'));
        await waitFor(() => expect(getMock.mock.calls.length).toBeGreaterThan(getCallsBefore));

        // Verify error rendered
        expect(await screen.findByTestId('addDocumentError')).toBeInTheDocument();
        expect(screen.queryByTestId('addDocumentSuccess')).not.toBeInTheDocument();
        expect(screen.getByTestId('addDocumentError')).toHaveTextContent(error.message);
      });
    });

    describe('Documents dropdown', () => {
      beforeEach(async () => {
        const postMock = jest.mocked(httpSetup.post);

        httpRequestsMockHelpers.setSimulatePipelineResponse(
          addProcessorTagtoMockOutput(SIMULATE_RESPONSE)
        );

        // Open flyout
        fireEvent.click(screen.getByTestId('addDocumentsButton'));
        await screen.findByTestId('testPipelineFlyout');
        // Add sample documents and click run
        fireEvent.change(screen.getByTestId('documentsEditor'), {
          target: { value: JSON.stringify(DOCUMENTS) },
        });
        const runCallsBefore = postMock.mock.calls.length;
        fireEvent.click(screen.getByTestId('runPipelineButton'));
        await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(runCallsBefore));
        await screen.findByTestId('outputTabContent');
        // Close flyout
        fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
        await waitFor(() =>
          expect(screen.queryByTestId('testPipelineFlyout')).not.toBeInTheDocument()
        );
      });

      it('should open flyout to edit documents', () => {
        // Dropdown should be visible
        expect(screen.getByTestId('documentsDropdown')).toBeInTheDocument();

        // Open dropdown and edit documents
        fireEvent.click(
          within(screen.getByTestId('documentsDropdown')).getByTestId('documentsButton')
        );
        fireEvent.click(screen.getByTestId('editDocumentsButton'));

        // Flyout should be visible with "Documents" tab enabled
        expect(screen.getByTestId('testPipelineFlyout')).toBeInTheDocument();
        expect(screen.getByTestId('documentsTabContent')).toBeInTheDocument();
      });

      it('should clear all documents and stop pipeline simulation', async () => {
        // Dropdown should be visible and processor status should equal "success"
        expect(screen.getByTestId('documentsDropdown')).toBeInTheDocument();
        expect(
          within(screen.getByTestId('processors>0')).getByTestId('processorStatusIcon')
        ).toHaveTextContent('Success');

        // Open flyout and click clear all button
        fireEvent.click(
          within(screen.getByTestId('documentsDropdown')).getByTestId('documentsButton')
        );
        fireEvent.click(screen.getByTestId('editDocumentsButton'));
        fireEvent.click(screen.getByTestId('clearAllDocumentsButton'));

        const modal = await screen.findByTestId('resetDocumentsConfirmationModal');
        expect(modal).toHaveTextContent('Clear documents');
        fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));
        await waitFor(() =>
          expect(screen.queryByTestId('resetDocumentsConfirmationModal')).not.toBeInTheDocument()
        );

        // Verify documents and processors were reset
        expect(screen.queryByTestId('documentsDropdown')).not.toBeInTheDocument();
        expect(screen.getByTestId('addDocumentsButton')).toBeInTheDocument();
        expect(
          within(screen.getByTestId('processors>0')).getByTestId('processorStatusIcon')
        ).toHaveTextContent('Not run');
      });
    });
  });

  describe('Processors', () => {
    it('should show "inactive" processor status by default', async () => {
      expect(
        within(screen.getByTestId('processors>0')).getByTestId('processorStatusIcon')
      ).toHaveTextContent('Not run');
    });

    it('should update the processor status after execution', async () => {
      const postMock = jest.mocked(httpSetup.post);

      const mockVerboseOutputWithProcessorTag = addProcessorTagtoMockOutput(SIMULATE_RESPONSE);
      httpRequestsMockHelpers.setSimulatePipelineResponse(mockVerboseOutputWithProcessorTag);

      // Open flyout
      fireEvent.click(screen.getByTestId('addDocumentsButton'));
      await screen.findByTestId('testPipelineFlyout');

      // Add sample documents and click run
      fireEvent.change(screen.getByTestId('documentsEditor'), {
        target: { value: JSON.stringify(DOCUMENTS) },
      });
      const runCallsBefore = postMock.mock.calls.length;
      fireEvent.click(screen.getByTestId('runPipelineButton'));
      await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(runCallsBefore));
      await screen.findByTestId('outputTabContent');
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
      await waitFor(() =>
        expect(screen.queryByTestId('testPipelineFlyout')).not.toBeInTheDocument()
      );

      // Verify status
      expect(
        within(screen.getByTestId('processors>0')).getByTestId('processorStatusIcon')
      ).toHaveTextContent('Success');
    });

    describe('Configuration tab', () => {
      it('should not clear up form when clicking configuration tab', async () => {
        // Click processor to open manage flyout
        fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
        await screen.findByTestId('editProcessorForm');
        // Click the "Configuration" tab
        fireEvent.click(screen.getByTestId('configurationTab'));
        // Verify type selector has not changed
        expect(
          within(screen.getByTestId('processorTypeSelector')).getByTestId('input')
        ).toHaveValue('Set');
      });
    });

    describe('Output tab', () => {
      beforeEach(async () => {
        const postMock = jest.mocked(httpSetup.post);

        const mockVerboseOutputWithProcessorTag = addProcessorTagtoMockOutput(SIMULATE_RESPONSE);
        httpRequestsMockHelpers.setSimulatePipelineResponse(mockVerboseOutputWithProcessorTag);

        // Add documents and run the pipeline
        fireEvent.click(screen.getByTestId('addDocumentsButton'));
        await screen.findByTestId('testPipelineFlyout');
        fireEvent.change(screen.getByTestId('documentsEditor'), {
          target: { value: JSON.stringify(DOCUMENTS) },
        });
        const runCallsBefore = postMock.mock.calls.length;
        fireEvent.click(screen.getByTestId('runPipelineButton'));
        await waitFor(() => expect(postMock.mock.calls.length).toBeGreaterThan(runCallsBefore));
        await screen.findByTestId('outputTabContent');
        fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
        await waitFor(() =>
          expect(screen.queryByTestId('testPipelineFlyout')).not.toBeInTheDocument()
        );
      });

      it('should show the output of the processor', async () => {
        // Click processor to open manage flyout
        fireEvent.click(within(screen.getByTestId('processors>0')).getByTestId('manageItemButton'));
        await screen.findByTestId('editProcessorForm');

        // Navigate to "Output" tab
        fireEvent.click(screen.getByTestId('outputTab'));
        // Verify content
        expect(await screen.findByTestId('processorOutputTabContent')).toBeInTheDocument();
      });
    });
  });
});

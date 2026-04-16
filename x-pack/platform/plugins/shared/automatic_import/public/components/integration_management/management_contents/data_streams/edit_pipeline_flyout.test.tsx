/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPipelineFlyout } from './edit_pipeline_flyout';
import type { DataStreamResponse } from '../../../../../common';
import type { GetDataStreamResultsResponse } from '../../../../common/lib/api';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: jest.fn(({ value, onChange }) => (
    <div>
      <div data-test-subj="code-editor">{value}</div>
      <button
        type="button"
        data-test-subj="code-editor-change"
        onClick={() =>
          onChange?.(
            JSON.stringify(
              {
                processors: [
                  {
                    set: {
                      field: 'test.field',
                      value: 'updated',
                    },
                  },
                ],
              },
              null,
              2
            )
          )
        }
      >
        {'Change editor value'}
      </button>
      <button
        type="button"
        className="euiCodeBlock__copyButton"
        data-test-subj="code-editor-copy"
        aria-label="Copy"
      >
        {'Copy'}
      </button>
    </div>
  )),
}));

const mockUseGetDataStreamResults = jest.fn();
const mockMutateAsync = jest.fn();
jest.mock('../../../../common', () => ({
  useGetDataStreamResults: (integrationId: string, dataStreamId: string) =>
    mockUseGetDataStreamResults(integrationId, dataStreamId),
  useUpdateDataStreamPipeline: () => ({
    updateDataStreamPipelineMutation: {
      mutateAsync: mockMutateAsync,
      isLoading: false,
    },
  }),
}));

const mockSelectPipelineTab = jest.fn();
const mockUIState = {
  selectedPipelineTab: 'table' as 'table' | 'pipeline',
  selectPipelineTab: mockSelectPipelineTab,
};

jest.mock('../../contexts', () => ({
  useUIState: () => mockUIState,
}));

const mockReportCodeEditorCopyClicked = jest.fn();
const mockReportPipelineEdited = jest.fn();
const mockReportEditPipelineTabOpened = jest.fn();
jest.mock('../../../telemetry_context', () => ({
  useTelemetry: () => ({
    sessionId: 'test-session-id',
    reportDataStreamFlyoutOpened: jest.fn(),
    reportEditDataStreamFlyoutOpened: jest.fn(),
    reportAnalyzeLogsTriggered: jest.fn(),
    reportEditPipelineTabOpened: mockReportEditPipelineTabOpened,
    reportCodeEditorCopyClicked: mockReportCodeEditorCopyClicked,
    reportPipelineEdited: mockReportPipelineEdited,
  }),
}));

const createMockDataStream = (overrides: Partial<DataStreamResponse> = {}): DataStreamResponse => ({
  dataStreamId: 'ds-1',
  title: 'Test Data Stream',
  description: 'Test description',
  status: 'completed',
  inputTypes: [{ name: 'filestream' }],
  ...overrides,
});

const createMockResults = (
  overrides: Partial<GetDataStreamResultsResponse> = {}
): GetDataStreamResultsResponse => ({
  ingest_pipeline: {
    processors: [
      {
        set: {
          field: 'test.field',
          value: 'test_value',
        },
      },
    ],
  },
  results: [
    {
      '@timestamp': '2024-01-01T00:00:00Z',
      message: 'Test log message',
      'test.field': 'test_value',
      'test.number': 42,
      'test.boolean': true,
      'test.nested': {
        inner: 'value',
      },
    },
    {
      '@timestamp': '2024-01-02T00:00:00Z',
      message: 'Second log message',
      'test.field': 'another_value',
    },
  ],
  ...overrides,
});

describe('EditPipelineFlyout', () => {
  const defaultProps = {
    integrationId: 'integration-123',
    integrationName: 'Test Integration',
    dataStream: createMockDataStream(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue(createMockResults());
    mockReportCodeEditorCopyClicked.mockClear();
    mockUIState.selectedPipelineTab = 'table';
    mockUseGetDataStreamResults.mockReturnValue({
      data: createMockResults(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('should render the flyout with data stream title', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('Test Data Stream')).toBeInTheDocument();
    });

    it('should render the Documents label', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('should render pagination when there are results', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      // Pagination should show 2 pages (0 and 1)
      expect(
        screen.getByRole('navigation', { name: /edit pipeline pagination/i })
      ).toBeInTheDocument();
    });

    it('should not render pagination when there are no results', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: { ...createMockResults(), results: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(
        screen.queryByRole('navigation', { name: /edit pipeline pagination/i })
      ).not.toBeInTheDocument();
    });

    it('should render table and pipeline tabs', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByRole('tab', { name: 'Table' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Ingest pipeline' })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error callout when there is an error', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Test error'),
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('Error loading data')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('table tab', () => {
    it('should show table when table tab is selected', () => {
      mockUIState.selectedPipelineTab = 'table';

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render flattened fields in table', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      // Check for flattened field names
      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('test.field')).toBeInTheDocument();
      expect(screen.getByText('test.number')).toBeInTheDocument();
    });

    it('should render field values in table', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('Test log message')).toBeInTheDocument();
      expect(screen.getByText('test_value')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render nested objects as flattened fields', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('test.nested.inner')).toBeInTheDocument();
      expect(screen.getByText('value')).toBeInTheDocument();
    });

    it('should show search box with correct placeholder', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByPlaceholderText('Filter by field, value')).toBeInTheDocument();
    });

    it('should filter table results when searching', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      const searchBox = screen.getByPlaceholderText('Filter by field, value');
      await userEvent.type(searchBox, 'message');

      expect(screen.getByText('message')).toBeInTheDocument();
    });

    it('should switch to table tab when clicked', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';

      render(<EditPipelineFlyout {...defaultProps} />);

      const tableTab = screen.getByRole('tab', { name: 'Table' });
      await userEvent.click(tableTab);

      expect(mockSelectPipelineTab).toHaveBeenCalledWith('table');
    });
  });

  describe('pipeline tab', () => {
    it('should show code editor when pipeline tab is selected', () => {
      mockUIState.selectedPipelineTab = 'pipeline';

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
    });

    it('should display formatted JSON pipeline', () => {
      mockUIState.selectedPipelineTab = 'pipeline';

      render(<EditPipelineFlyout {...defaultProps} />);

      const editor = screen.getByTestId('code-editor');
      expect(editor).toHaveTextContent('processors');
      expect(editor).toHaveTextContent('test.field');
    });

    it('should not show code editor when no results', () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      mockUseGetDataStreamResults.mockReturnValue({
        data: { ...createMockResults(), results: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
    });

    it('should switch to pipeline tab when clicked', async () => {
      mockUIState.selectedPipelineTab = 'table';

      render(<EditPipelineFlyout {...defaultProps} />);

      const pipelineTab = screen.getByRole('tab', { name: 'Ingest pipeline' });
      await userEvent.click(pipelineTab);

      expect(mockSelectPipelineTab).toHaveBeenCalledWith('pipeline');
    });

    it('calls reportEditPipelineTabOpened when pipeline tab is clicked', async () => {
      mockUIState.selectedPipelineTab = 'table';

      render(<EditPipelineFlyout {...defaultProps} />);

      const pipelineTab = screen.getByRole('tab', { name: 'Ingest pipeline' });
      await userEvent.click(pipelineTab);

      expect(mockReportEditPipelineTabOpened).toHaveBeenCalled();
    });

    it('should render save button and submit updated pipeline', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      const saveButton = screen.getByTestId('editPipelineFlyoutSaveButton');
      await userEvent.click(saveButton);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        integrationId: 'integration-123',
        dataStreamId: 'ds-1',
        ingestPipeline: expect.stringContaining('"processors"'),
      });
    });

    it('should report pipeline edited telemetry with line diff stats', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByTestId('editPipelineFlyoutSaveButton'));

      expect(mockReportPipelineEdited).toHaveBeenCalledWith(
        expect.objectContaining({
          linesAdded: expect.any(Number),
          linesRemoved: expect.any(Number),
          netLineChange: expect.any(Number),
        })
      );
    });

    it('should report telemetry when copy button is clicked', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      const copyButton = screen.getByTestId('code-editor-copy');
      await userEvent.click(copyButton);

      expect(mockReportCodeEditorCopyClicked).toHaveBeenCalledWith();
    });
  });

  describe('pagination', () => {
    it('should change active document when pagination clicked', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('test_value')).toBeInTheDocument();

      // Find the pagination in the flyout header (not in the table)
      const paginationNav = screen.getByRole('navigation', { name: /edit pipeline pagination/i });
      const nextButton = within(paginationNav).getByTestId('pagination-button-next');
      await userEvent.click(nextButton);

      expect(screen.getByText('Second log message')).toBeInTheDocument();
      expect(screen.getByText('another_value')).toBeInTheDocument();
    });

    it('should update table data when switching documents', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('test_value')).toBeInTheDocument();

      const paginationNav = screen.getByRole('navigation', { name: /edit pipeline pagination/i });
      const nextButton = within(paginationNav).getByTestId('pagination-button-next');
      await userEvent.click(nextButton);

      // Second document should show "another_value"
      expect(screen.getByText('another_value')).toBeInTheDocument();
    });
  });

  describe('flyout controls', () => {
    it('should call onClose when flyout is closed', async () => {
      const onClose = jest.fn();
      render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should warn before closing when pipeline has unsaved changes', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      const onClose = jest.fn();
      render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(
        screen.getByText('You have unsaved changes in the ingest pipeline editor.')
      ).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('type icons', () => {
    it('should render type icons for each field', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      const table = screen.getByRole('table');
      const tokenIcons = table.querySelectorAll('[data-euiicon-type^="token"]');

      expect(tokenIcons.length).toBeGreaterThan(0);
    });

    it('should show tooltip with field type on hover', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      const table = screen.getByRole('table');
      const dateIcon = table.querySelector('[data-euiicon-type="tokenDate"]');
      expect(dateIcon).toBeInTheDocument();

      if (dateIcon) {
        fireEvent.mouseOver(dateIcon);

        const tooltip = await screen.findByText('date');
        expect(tooltip).toBeInTheDocument();
      }
    });
  });

  describe('value tooltips', () => {
    it('should render values that will show tooltips on hover', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('Test log message')).toBeInTheDocument();
      expect(screen.getByText('test_value')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });
  });
});

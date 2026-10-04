/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen, within, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { EditPipelineFlyout } from './edit_pipeline_flyout';
import type { DataStreamResponse, DataStreamResults } from '../../../../../common';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: I18nProvider });

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
const mockSaveFieldTypes = jest.fn();
jest.mock('../../../../common', () => ({
  useGetDataStreamResults: (integrationId: string, dataStreamId: string) =>
    mockUseGetDataStreamResults(integrationId, dataStreamId),
  useUpdateDataStreamPipeline: () => ({
    updateDataStreamPipelineMutation: {
      mutateAsync: mockMutateAsync,
      isLoading: false,
    },
  }),
  useUpdateDataStreamFieldTypes: () => ({
    updateDataStreamFieldTypesMutation: {
      mutateAsync: mockSaveFieldTypes,
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

const createMockResults = (overrides: Partial<DataStreamResults> = {}): DataStreamResults => ({
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
  field_mapping: [
    { name: '@timestamp', type: 'date', is_ecs: true },
    { name: 'message', type: 'match_only_text', is_ecs: true },
    { name: 'test.field', type: 'keyword', is_ecs: false },
    { name: 'test.number', type: 'long', is_ecs: false },
    { name: 'test.boolean', type: 'boolean', is_ecs: false },
    { name: 'test.nested.inner', type: 'keyword', is_ecs: false },
  ],
  field_type_overrides: [],
  version: 'WzEsMV0=',
  ...overrides,
});

describe('EditPipelineFlyout', () => {
  const defaultProps = {
    integrationId: 'integration-123',
    dataStream: createMockDataStream(),
    onClose: jest.fn(),
    fieldTypeEditState: 'editable' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue(createMockResults());
    mockSaveFieldTypes.mockResolvedValue({ status: 'saved', ...createMockResults() });
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

    it('populates the table from the current document when field mappings are empty', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: { ...createMockResults(), field_mapping: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('test.field')).toBeInTheDocument();
      expect(screen.getByText('Test log message')).toBeInTheDocument();
      expect(screen.getByText('test_value')).toBeInTheDocument();
    });

    it('populates values from wrapped pipeline _source documents', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: {
          ...createMockResults(),
          results: [
            {
              _source: {
                message: 'Wrapped log message',
                'test.field': 'wrapped_value',
              },
            },
          ],
          field_mapping: [
            { name: 'message', type: 'match_only_text', is_ecs: true },
            { name: 'test.field', type: 'keyword', is_ecs: false },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('Wrapped log message')).toBeInTheDocument();
      expect(screen.getByText('wrapped_value')).toBeInTheDocument();
    });

    it('should show search box with correct placeholder', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByPlaceholderText('Filter by field, type, value')).toBeInTheDocument();
    });

    it('should filter table results when searching', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      const searchBox = screen.getByPlaceholderText('Filter by field, type, value');
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

    it('shows separate field, type, and value columns', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByRole('columnheader', { name: 'Field' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    });

    it('keeps ECS fields read-only', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.queryByTestId('mappingEditorEditType-@timestamp')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mappingEditorEditType-message')).not.toBeInTheDocument();
      expect(screen.getByTestId('mappingEditorEditType-test.boolean')).toBeEnabled();
    });

    const stageType = async (fieldName: string, type: string) => {
      await userEvent.click(screen.getByTestId(`mappingEditorEditType-${fieldName}`));
      await userEvent.click(screen.getByTestId(`mappingEditorInlineTypeSelect-${fieldName}`));
      await userEvent.click(screen.getByTestId(`mappingEditorTypeOption-${type}`));
    };

    it('saves only the changed fields to the server and closes the flyout', async () => {
      const onClose = jest.fn();
      render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

      await stageType('test.number', 'integer');

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      expect(screen.getByTestId('mappingEditorApplyButton')).toBeEnabled();

      await userEvent.click(screen.getByTestId('mappingEditorApplyButton'));

      expect(mockSaveFieldTypes).toHaveBeenCalledWith({
        integrationId: 'integration-123',
        dataStreamId: 'ds-1',
        version: 'WzEsMV0=',
        changes: [{ name: 'test.number', type: 'integer' }],
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('marks rows that failed the server check and keeps save enabled', async () => {
      mockSaveFieldTypes.mockResolvedValue({
        status: 'failure',
        errors: [
          {
            name: 'test.number',
            issue: 'out_of_range',
            failing_documents: 1,
            total_documents: 1,
          },
        ],
      });
      const onClose = jest.fn();
      render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

      await stageType('test.number', 'integer');
      await userEvent.click(screen.getByTestId('mappingEditorApplyButton'));

      expect(
        await screen.findByText(
          'Values are out of range for integer. Affects 1 of 1 sample documents.'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('mappingEditorServerErrors')).toHaveTextContent('test.number');
      expect(screen.getByTestId('mappingEditorApplyButton')).toBeEnabled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('clears a hiding search and shows the first field that failed the server check', async () => {
      const results = createMockResults();
      const extraFields = Array.from({ length: 12 }, (_, index) => `extra.field_${index}`);
      const failingField = extraFields[11];
      mockUseGetDataStreamResults.mockReturnValue({
        data: {
          ...results,
          results: [
            {
              ...results.results[0],
              ...Object.fromEntries(extraFields.map((name) => [name, 'value'])),
            },
            results.results[1],
          ],
          field_mapping: [
            ...(results.field_mapping ?? []),
            ...extraFields.map((name) => ({ name, type: 'keyword', is_ecs: false })),
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      mockSaveFieldTypes.mockResolvedValue({
        status: 'failure',
        errors: [
          {
            name: failingField,
            issue: 'out_of_range',
            failing_documents: 1,
            total_documents: 1,
          },
        ],
      });
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.type(
        screen.getByPlaceholderText('Filter by field, type, value'),
        failingField
      );
      await stageType(failingField, 'integer');
      await userEvent.click(screen.getByTestId('mappingEditorApplyButton'));

      expect(await screen.findByTestId('mappingEditorServerErrors')).toHaveTextContent(
        failingField
      );
      expect(screen.getByPlaceholderText('Filter by field, type, value')).toHaveValue('');
      expect(
        screen.getByTestId(`mappingEditorInlineTypeSelect-${failingField}`)
      ).toBeInTheDocument();
    });

    it('keeps the select open without blocking save when sample values are certain to fail', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      await stageType('test.field', 'constant_keyword');

      expect(screen.getByTestId('mappingEditorInlineTypeSelect-test.field')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The sample values are not constant across documents. Affects 1 of 2 sample documents.'
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('mappingEditorApplyButton')).toBeEnabled();
    });

    it('shows saved type edits like any other field', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: createMockResults({
          field_type_overrides: [{ name: 'test.number', type: 'long', original_type: 'keyword' }],
        }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.queryByText(/Edited from/)).not.toBeInTheDocument();
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });

    it('stays on the current table page after staging a type change', async () => {
      const results = createMockResults();
      const extraFields = Array.from({ length: 12 }, (_, index) => `extra.field_${index}`);
      mockUseGetDataStreamResults.mockReturnValue({
        data: {
          ...results,
          results: [
            {
              ...results.results[0],
              ...Object.fromEntries(extraFields.map((name) => [name, 'value'])),
            },
            results.results[1],
          ],
          field_mapping: [
            ...(results.field_mapping ?? []),
            ...extraFields.map((name) => ({ name, type: 'keyword', is_ecs: false })),
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('pagination-button-1'));
      const [editButton] = screen.getAllByTestId(/^mappingEditorEditType-/);
      const fieldName = editButton
        .getAttribute('data-test-subj')
        ?.replace('mappingEditorEditType-', '');

      await stageType(fieldName ?? '', 'text');

      expect(screen.getByTestId(`mappingEditorEditType-${fieldName}`)).toBeInTheDocument();
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('renders mapping actions in the flyout footer', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      const footer = screen.getByTestId('mappingEditorFooter');
      expect(within(footer).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
      expect(within(footer).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('allows every custom leaf field to open the editor', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('mappingEditorEditType-test.boolean'));

      expect(screen.getByTestId('mappingEditorInlineTypeSelect-test.boolean')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('mappingEditorInlineTypeSelect-test.boolean'));
      expect(screen.getByTestId('mappingEditorTypeOption-keyword')).toBeInTheDocument();
    });

    it('makes the type column sortable', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(
        within(screen.getByRole('columnheader', { name: 'Type' })).getByRole('button')
      ).toBeInTheDocument();
    });

    it('keeps field types read-only for a data stream included in the last approved package', () => {
      render(<EditPipelineFlyout {...defaultProps} fieldTypeEditState="locked" />);

      expect(screen.getByTestId('mappingEditorReadOnlyNotice')).toHaveTextContent(
        'already part of an approved and installed package'
      );
      expect(screen.queryByTestId('mappingEditorEditType-test.field')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mappingEditorEditType-test.number')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mappingEditorApplyButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mappingEditorFooter')).not.toBeInTheDocument();
    });

    it.each([
      ['loading', 'Checking whether field types can be edited'],
      ['error', 'edit status could not be loaded'],
      ['reanalyzing', 'Analysis is in progress'],
    ] as const)(
      'keeps field types read-only while edit state is %s',
      (fieldTypeEditState, text) => {
        render(<EditPipelineFlyout {...defaultProps} fieldTypeEditState={fieldTypeEditState} />);

        expect(screen.getByTestId('mappingEditorReadOnlyNotice')).toHaveTextContent(text);
        expect(screen.queryByTestId('mappingEditorEditType-test.field')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mappingEditorFooter')).not.toBeInTheDocument();
      }
    );
  });

  describe('pipeline tab', () => {
    it('renders save and reset in the flyout footer', () => {
      mockUIState.selectedPipelineTab = 'pipeline';

      render(<EditPipelineFlyout {...defaultProps} />);

      const footer = screen.getByTestId('mappingEditorFooter');
      expect(within(footer).getByRole('button', { name: 'Reset' })).toBeInTheDocument();
      expect(within(footer).getByTestId('editPipelineFlyoutSaveButton')).toBeInTheDocument();
    });

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

    it('should show the pipeline editor when no preview documents are available', () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      mockUseGetDataStreamResults.mockReturnValue({
        data: { ...createMockResults(), results: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
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
      const onClose = jest.fn();
      render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      const saveButton = screen.getByTestId('editPipelineFlyoutSaveButton');
      await userEvent.click(saveButton);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        integrationId: 'integration-123',
        dataStreamId: 'ds-1',
        version: 'WzEsMV0=',
        ingestPipeline: expect.stringContaining('"processors"'),
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should report pipeline edited telemetry with line diff stats', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByTestId('editPipelineFlyoutSaveButton'));

      expect(mockReportPipelineEdited).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'integration-123',
          dataStreamId: 'ds-1',
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

      expect(mockReportCodeEditorCopyClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId: 'integration-123',
          dataStreamId: 'ds-1',
        })
      );
    });

    it('disables pipeline save when the table has unsaved type edits', async () => {
      const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('mappingEditorEditType-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorInlineTypeSelect-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorTypeOption-integer'));

      mockUIState.selectedPipelineTab = 'pipeline';
      rerender(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByTestId('editPipelineFlyoutOtherTabWarning')).toHaveTextContent(
        'Table tab'
      );
      expect(screen.getByTestId('editPipelineFlyoutSaveButton')).toBeDisabled();
    });

    it('disables table save when the pipeline has unsaved edits', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));

      mockUIState.selectedPipelineTab = 'table';
      rerender(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByTestId('editPipelineFlyoutOtherTabWarning')).toHaveTextContent(
        'Ingest pipeline tab'
      );

      await userEvent.click(screen.getByTestId('mappingEditorEditType-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorInlineTypeSelect-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorTypeOption-integer'));

      expect(screen.getByTestId('mappingEditorApplyButton')).toBeDisabled();
    });

    it('does not overwrite unsaved pipeline JSON when results refetch', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      const editedText = screen.getByTestId('code-editor').textContent;

      mockUseGetDataStreamResults.mockReturnValue({
        data: createMockResults({
          ingest_pipeline: { processors: [{ set: { field: 'other', value: 'refetched' } }] },
        }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      rerender(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByTestId('code-editor').textContent).toBe(editedText);
      expect(screen.getByTestId('code-editor')).not.toHaveTextContent('refetched');
    });
  });

  describe('pagination', () => {
    it('keeps staged mapping changes when switching documents', async () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('mappingEditorEditType-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorInlineTypeSelect-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorTypeOption-integer'));

      const paginationNav = screen.getByRole('navigation', { name: /edit pipeline pagination/i });
      await userEvent.click(within(paginationNav).getByTestId('pagination-button-next'));

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      expect(screen.getByTestId('mappingEditorApplyButton')).toBeEnabled();

      await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
      expect(screen.getByTestId('mappingEditorApplyButton')).toBeDisabled();
    });

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

      expect(screen.getByText('You have unsaved changes in this editor.')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('warns before closing when a field type change is staged', async () => {
      const onClose = jest.fn();
      render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

      await userEvent.click(screen.getByTestId('mappingEditorEditType-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorInlineTypeSelect-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorTypeOption-integer'));
      await userEvent.click(screen.getByRole('button', { name: /close/i }));

      expect(screen.getByText('You have unsaved changes in this editor.')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
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

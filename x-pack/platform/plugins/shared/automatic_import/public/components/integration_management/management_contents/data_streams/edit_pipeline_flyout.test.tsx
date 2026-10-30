/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  act,
  render as rtlRender,
  screen,
  within,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { EditPipelineFlyout } from './edit_pipeline_flyout';
import type { DataStreamResponse, DataStreamResults } from '../../../../../common';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: I18nProvider });

const mockSetModelMarkers = jest.fn();
const mockRevealLine = jest.fn();
const mockEditorValue = { current: '' };
const mockEditorText = { current: '' };
const mockEditor = {
  getModel: () => ({
    getLineCount: () => mockEditorText.current.split('\n').length,
    getLineFirstNonWhitespaceColumn: () => 1,
    getLineMaxColumn: () => 80,
    isDisposed: () => false,
  }),
  revealLineInCenter: mockRevealLine,
  setPosition: jest.fn(),
  focus: jest.fn(),
};

const MockEditorMount = ({ value, onMount }: { value: string; onMount: () => void }) => {
  mockEditorText.current = value;
  useEffect(() => {
    onMount();
  }, [onMount]);
  return null;
};

jest.mock('@kbn/code-editor', () => ({
  XJSON_LANG_ID: 'xjson',
  monaco: {
    editor: { setModelMarkers: (...args: unknown[]) => mockSetModelMarkers(...args) },
    MarkerSeverity: { Error: 8 },
  },
  CodeEditor: jest.fn(({ value, onChange, editorDidMount }) => (
    <div>
      <MockEditorMount value={value} onMount={() => editorDidMount?.(mockEditor)} />
      <div data-test-subj="code-editor">{value}</div>
      <button
        type="button"
        data-test-subj="code-editor-set"
        onClick={() => onChange?.(mockEditorValue.current)}
      >
        {'Set editor value'}
      </button>
      <button
        type="button"
        data-test-subj="code-editor-invalid"
        onClick={() => onChange?.('{ "processors": [')}
      >
        {'Make editor value invalid'}
      </button>
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
const mockApplyEdits = jest.fn();
jest.mock('../../../../common', () => ({
  useGetDataStreamResults: (integrationId: string, dataStreamId: string) =>
    mockUseGetDataStreamResults(integrationId, dataStreamId),
  useApplyDataStreamEdits: () => ({
    applyDataStreamEditsMutation: {
      mutateAsync: mockApplyEdits,
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
  approved_field_types: [],
  data_stream_approved: false,
  version: 'WzEsMV0=',
  ...overrides,
});

describe('EditPipelineFlyout', () => {
  const defaultProps = {
    integrationId: 'integration-123',
    dataStream: createMockDataStream(),
    onClose: jest.fn(),
    editState: 'editable' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApplyEdits.mockImplementation(async ({ dryRun }: { dryRun: boolean }) => ({
      status: dryRun ? 'preview' : 'saved',
      dropped_field_types: [],
      ...createMockResults(),
    }));
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

    it('expands arrays of objects into their fields with sample values', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: {
          ...createMockResults(),
          results: [
            {
              rules: [
                { name: 'block-ssh', owner: 'admin' },
                { name: 'allow-web', owner: 'admin' },
              ],
            },
          ],
          field_mapping: [
            { name: 'rules.name', type: 'keyword', is_ecs: false },
            { name: 'rules.owner', type: 'keyword', is_ecs: false },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.queryByText('rules')).not.toBeInTheDocument();
      expect(screen.getByText('rules.name')).toBeInTheDocument();
      expect(screen.getByText('["block-ssh","allow-web"]')).toBeInTheDocument();
      expect(screen.getByText('rules.owner')).toBeInTheDocument();
      expect(screen.getByText('["admin","admin"]')).toBeInTheDocument();
    });

    it('shows a single array value without brackets', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: {
          ...createMockResults(),
          results: [{ rules: [{ owner: 'admin' }], tags: ['prod'] }],
          field_mapping: [
            { name: 'rules.owner', type: 'keyword', is_ecs: false },
            { name: 'tags', type: 'keyword', is_ecs: false },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });

      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('prod')).toBeInTheDocument();
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

      await waitFor(() => expect(mockSelectPipelineTab).toHaveBeenCalledWith('table'));
      expect(mockApplyEdits).not.toHaveBeenCalled();
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

      expect(mockApplyEdits).toHaveBeenCalledWith({
        integrationId: 'integration-123',
        dataStreamId: 'ds-1',
        version: 'WzEsMV0=',
        ingestPipeline: expect.stringContaining('"processors"'),
        changes: [{ name: 'test.number', type: 'integer' }],
        dryRun: false,
        acknowledgeBreakingChanges: false,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('marks rows that failed the server check and keeps save enabled', async () => {
      mockApplyEdits.mockResolvedValue({
        status: 'failure',
        field_errors: [
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
      mockApplyEdits.mockResolvedValue({
        status: 'failure',
        field_errors: [
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

    it('explains when field types can be edited in the Type column header', () => {
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(
        within(screen.getByRole('columnheader', { name: /Type/ })).getByTestId(
          'mappingEditorTypeHeaderTip'
        )
      ).toBeInTheDocument();
    });

    it('keeps every field type read-only once the data stream is approved', () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: createMockResults({
          approved_field_types: [{ name: 'test.field', type: 'keyword' }],
          data_stream_approved: true,
        }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.queryByTestId('editPipelineFlyoutApprovedNotice')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mappingEditorTypeHeaderTip')).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(/^mappingEditorEditType-/)).toHaveLength(0);
      expect(screen.queryAllByTestId(/^mappingEditorApprovedType-/)).toHaveLength(0);
      expect(screen.getByTestId('mappingEditorFooter')).toBeInTheDocument();
    });

    it('shows why an approved field failed without offering a type select', async () => {
      mockUseGetDataStreamResults.mockReturnValue({
        data: createMockResults({
          approved_field_types: [{ name: 'test.number', type: 'long' }],
          data_stream_approved: true,
        }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      mockApplyEdits.mockImplementationOnce(
        async ({ ingestPipeline }: { ingestPipeline: string }) => ({
          status: 'preview',
          dropped_field_types: [],
          ...createMockResults({ ingest_pipeline: JSON.parse(ingestPipeline) }),
        })
      );
      mockUIState.selectedPipelineTab = 'pipeline';
      const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByRole('tab', { name: 'Table' }));
      await waitFor(() => expect(mockSelectPipelineTab).toHaveBeenCalledWith('table'));
      mockUIState.selectedPipelineTab = 'table';
      rerender(<EditPipelineFlyout {...defaultProps} />);

      mockApplyEdits.mockResolvedValue({
        status: 'failure',
        field_errors: [
          {
            name: 'test.number',
            issue: 'not_numeric',
            failing_documents: 1,
            total_documents: 2,
            approved_type: 'long',
          },
        ],
      });
      await userEvent.click(screen.getByTestId('mappingEditorApplyButton'));

      expect(await screen.findByTestId('mappingEditorError-test.number')).toHaveTextContent(
        'Values are not numbers. Affects 1 of 2 sample documents. It is long in an approved version.'
      );
      expect(
        screen.queryByTestId('mappingEditorInlineTypeSelect-test.number')
      ).not.toBeInTheDocument();
    });

    it.each([
      ['loading', 'Checking whether field types can be edited'],
      ['error', 'edit status could not be loaded'],
      ['reanalyzing', 'Analysis is in progress'],
    ] as const)('keeps field types read-only while edit state is %s', (editState, text) => {
      render(<EditPipelineFlyout {...defaultProps} editState={editState} />);

      expect(screen.getByTestId('mappingEditorReadOnlyNotice')).toHaveTextContent(text);
      expect(screen.queryByTestId('mappingEditorEditType-test.field')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mappingEditorFooter')).not.toBeInTheDocument();
    });
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

      expect(mockApplyEdits).toHaveBeenCalledWith({
        integrationId: 'integration-123',
        dataStreamId: 'ds-1',
        version: 'WzEsMV0=',
        ingestPipeline: expect.stringContaining('"updated"'),
        changes: [],
        dryRun: false,
        acknowledgeBreakingChanges: false,
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

    it('adds a generated convert processor when switching to the pipeline tab', async () => {
      const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('mappingEditorEditType-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorInlineTypeSelect-test.number'));
      await userEvent.click(screen.getByTestId('mappingEditorTypeOption-keyword'));
      await userEvent.click(screen.getByRole('tab', { name: 'Ingest pipeline' }));

      expect(mockSelectPipelineTab).toHaveBeenCalledWith('pipeline');
      mockUIState.selectedPipelineTab = 'pipeline';
      rerender(<EditPipelineFlyout {...defaultProps} />);

      const editor = screen.getByTestId('code-editor');
      expect(editor).toHaveTextContent('automatic_import_field_type:test.number');
      expect(editor).toHaveTextContent('"type": "string"');
      expect(screen.getByTestId('editPipelineFlyoutSaveButton')).toBeEnabled();
      expect(mockApplyEdits).not.toHaveBeenCalled();
    });

    it('previews pipeline edits before switching to the table tab', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByRole('tab', { name: 'Table' }));

      await waitFor(() => expect(mockSelectPipelineTab).toHaveBeenCalledWith('table'));
      expect(mockApplyEdits).toHaveBeenCalledWith(
        expect.objectContaining({
          ingestPipeline: expect.stringContaining('"updated"'),
          changes: [],
          dryRun: true,
        })
      );
    });

    it('stays on the pipeline tab when the edited pipeline fails on more samples', async () => {
      mockApplyEdits.mockResolvedValue({
        status: 'failure',
        field_errors: [],
        pipeline_errors: {
          failed_samples: 2,
          baseline_failed_samples: 0,
          error_groups: [{ error: 'field [x] not present', count: 2, example_sample: '{}' }],
        },
      });
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByRole('tab', { name: 'Table' }));

      expect(await screen.findByTestId('editPipelineFlyoutPipelineErrors')).toHaveTextContent(
        'field [x] not present (2 samples)'
      );
      expect(mockSelectPipelineTab).not.toHaveBeenCalled();
    });

    it('lists field type errors from the preview on the pipeline tab', async () => {
      mockApplyEdits.mockResolvedValue({
        status: 'failure',
        field_errors: [{ name: 'test.number', issue: 'duplicate_generated_processor' }],
      });
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByRole('tab', { name: 'Table' }));

      expect(await screen.findByTestId('editPipelineFlyoutFieldErrors')).toHaveTextContent(
        'test.number: The ingest pipeline has more than one generated processor for this field.'
      );
      expect(mockSelectPipelineTab).not.toHaveBeenCalled();
    });

    it('keeps invalid JSON on the pipeline tab without calling the server', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-invalid'));
      await userEvent.click(screen.getByRole('tab', { name: 'Table' }));

      expect(await screen.findByTestId('editPipelineFlyoutApplyError')).toHaveTextContent(
        'Invalid ingest pipeline JSON'
      );
      expect(mockApplyEdits).not.toHaveBeenCalled();
      expect(mockSelectPipelineTab).not.toHaveBeenCalled();
    });

    describe('when typing stops', () => {
      const TAGGED_PIPELINE = JSON.stringify(
        { processors: [{ set: { field: 'x', value: 'y', tag: 'set_x' } }] },
        null,
        2
      );
      const regression = {
        status: 'failure',
        field_errors: [],
        pipeline_errors: {
          failed_samples: 2,
          baseline_failed_samples: 0,
          error_groups: [
            {
              error: 'field [x] not present',
              count: 2,
              example_sample: '{}',
              processor_tag: 'set_x',
            },
          ],
        },
      };
      const stopTyping = async () => {
        await act(async () => {
          jest.advanceTimersByTime(800);
        });
      };

      beforeEach(() => {
        jest.useFakeTimers();
        mockUIState.selectedPipelineTab = 'pipeline';
        mockEditorValue.current = TAGGED_PIPELINE;
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('checks the pipeline and shows its errors above the editor', async () => {
        mockApplyEdits.mockResolvedValue(regression);
        render(<EditPipelineFlyout {...defaultProps} />);

        fireEvent.click(screen.getByTestId('code-editor-set'));
        expect(mockApplyEdits).not.toHaveBeenCalled();
        await stopTyping();

        expect(mockApplyEdits).toHaveBeenCalledWith(
          expect.objectContaining({ ingestPipeline: TAGGED_PIPELINE, dryRun: true })
        );
        expect(screen.getByRole('tabpanel')).toContainElement(
          screen.getByTestId('editPipelineFlyoutPipelineErrors')
        );
        expect(screen.getByTestId('code-editor')).toHaveTextContent('set_x');
        expect(mockSelectPipelineTab).not.toHaveBeenCalled();
      });

      it('marks the failing processor and jumps to its line', async () => {
        mockApplyEdits.mockResolvedValue(regression);
        render(<EditPipelineFlyout {...defaultProps} />);

        fireEvent.click(screen.getByTestId('code-editor-set'));
        await stopTyping();

        expect(mockSetModelMarkers).toHaveBeenLastCalledWith(
          expect.anything(),
          'automaticImportPipeline',
          [
            expect.objectContaining({
              startLineNumber: 7,
              message: 'field [x] not present (2 samples)',
            }),
          ]
        );
        fireEvent.click(screen.getByRole('button', { name: 'Go to line 7' }));
        expect(mockRevealLine).toHaveBeenCalledWith(7);
      });

      it('clears the errors once the pipeline is fixed', async () => {
        mockApplyEdits.mockResolvedValueOnce(regression);
        render(<EditPipelineFlyout {...defaultProps} />);

        fireEvent.click(screen.getByTestId('code-editor-set'));
        await stopTyping();
        expect(screen.getByTestId('editPipelineFlyoutPipelineErrors')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('code-editor-change'));
        await stopTyping();

        expect(screen.queryByTestId('editPipelineFlyoutPipelineErrors')).not.toBeInTheDocument();
        expect(mockSetModelMarkers).toHaveBeenLastCalledWith(
          expect.anything(),
          'automaticImportPipeline',
          []
        );
      });

      it('ignores a check that finishes after newer typing', async () => {
        let resolveFirstCheck: (value: unknown) => void = () => {};
        mockApplyEdits.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirstCheck = resolve;
            })
        );
        render(<EditPipelineFlyout {...defaultProps} />);

        fireEvent.click(screen.getByTestId('code-editor-set'));
        await stopTyping();
        expect(screen.getByTestId('editPipelineFlyoutChecking')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('code-editor-change'));
        await act(async () => {
          resolveFirstCheck(regression);
        });

        expect(screen.queryByTestId('editPipelineFlyoutPipelineErrors')).not.toBeInTheDocument();
        expect(screen.queryByTestId('editPipelineFlyoutChecking')).not.toBeInTheDocument();
      });

      it('does not check a read-only pipeline', async () => {
        render(<EditPipelineFlyout {...defaultProps} editState="reanalyzing" />);
        await stopTyping();

        expect(mockApplyEdits).not.toHaveBeenCalled();
      });
    });

    it('reads a hand-added generated processor as a type change', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      mockEditorValue.current = JSON.stringify({
        processors: [
          {
            convert: {
              tag: 'automatic_import_field_type:test.field',
              field: 'test.field',
              type: 'long',
            },
          },
        ],
      });
      render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-set'));
      await userEvent.click(screen.getByRole('tab', { name: 'Table' }));

      await waitFor(() =>
        expect(mockApplyEdits).toHaveBeenCalledWith(
          expect.objectContaining({ changes: [{ name: 'test.field', type: 'long' }], dryRun: true })
        )
      );
    });

    it('saves against the version the edits started from after a refetch', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

      await userEvent.click(screen.getByTestId('code-editor-change'));
      mockUseGetDataStreamResults.mockReturnValue({
        data: createMockResults({ version: 'WzIsMV0=' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      rerender(<EditPipelineFlyout {...defaultProps} />);
      await userEvent.click(screen.getByTestId('editPipelineFlyoutSaveButton'));

      expect(mockApplyEdits).toHaveBeenLastCalledWith(
        expect.objectContaining({ dryRun: false, version: 'WzEsMV0=' })
      );
    });

    it('uses the refetched version when there are no edits yet', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

      mockUseGetDataStreamResults.mockReturnValue({
        data: createMockResults({ version: 'WzIsMV0=' }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      rerender(<EditPipelineFlyout {...defaultProps} />);
      await userEvent.click(screen.getByTestId('code-editor-change'));
      await userEvent.click(screen.getByTestId('editPipelineFlyoutSaveButton'));

      expect(mockApplyEdits).toHaveBeenLastCalledWith(
        expect.objectContaining({ dryRun: false, version: 'WzIsMV0=' })
      );
    });

    it('shows a read-only pipeline while the data stream is reanalyzing', () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} editState="reanalyzing" />);

      expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
      expect(screen.getByTestId('editPipelineFlyoutReadOnlyPipeline')).toHaveTextContent(
        'test_value'
      );
      expect(screen.getByTestId('editPipelineFlyoutReadOnlyNotice')).toHaveTextContent(
        'ready for review'
      );
      expect(screen.queryByTestId('mappingEditorFooter')).not.toBeInTheDocument();
    });

    it('keeps the pipeline editable after approval', () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      mockUseGetDataStreamResults.mockReturnValue({
        data: createMockResults({
          approved_field_types: [{ name: 'test.field', type: 'keyword' }],
          data_stream_approved: true,
        }),
        isLoading: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
      });
      render(<EditPipelineFlyout {...defaultProps} />);

      expect(screen.getByTestId('code-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('editPipelineFlyoutApprovedNotice')).not.toBeInTheDocument();
      expect(screen.getByTestId('mappingEditorFooter')).toBeInTheDocument();
    });

    describe('when the pipeline stops producing approved fields', () => {
      const removedFields = ['test.number'];

      beforeEach(() => {
        mockUIState.selectedPipelineTab = 'pipeline';
        mockUseGetDataStreamResults.mockReturnValue({
          data: createMockResults({
            approved_field_types: [{ name: 'test.number', type: 'long' }],
            data_stream_approved: true,
          }),
          isLoading: false,
          isError: false,
          error: null,
          refetch: jest.fn(),
        });
        mockApplyEdits.mockImplementation(
          async ({
            dryRun,
            acknowledgeBreakingChanges,
          }: {
            dryRun: boolean;
            acknowledgeBreakingChanges?: boolean;
          }) => {
            if (dryRun) {
              return {
                status: 'preview',
                dropped_field_types: [],
                removed_approved_fields: removedFields,
                ...createMockResults(),
              };
            }
            if (!acknowledgeBreakingChanges) {
              return {
                status: 'failure',
                field_errors: [],
                removed_approved_fields: removedFields,
              };
            }
            return {
              status: 'saved',
              dropped_field_types: [],
              removed_approved_fields: removedFields,
              ...createMockResults(),
            };
          }
        );
      });

      it('warns about the removed fields on the pipeline tab, not the table', async () => {
        const { rerender } = render(<EditPipelineFlyout {...defaultProps} />);

        await userEvent.click(screen.getByTestId('code-editor-change'));
        await userEvent.click(screen.getByRole('tab', { name: 'Table' }));
        await waitFor(() => expect(mockSelectPipelineTab).toHaveBeenCalledWith('table'));
        mockUIState.selectedPipelineTab = 'table';
        rerender(<EditPipelineFlyout {...defaultProps} />);

        expect(screen.queryByTestId('editPipelineFlyoutBreakingChanges')).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('tab', { name: 'Ingest pipeline' }));
        mockUIState.selectedPipelineTab = 'pipeline';
        rerender(<EditPipelineFlyout {...defaultProps} />);

        const callout = screen.getByTestId('editPipelineFlyoutBreakingChanges');
        expect(callout).toHaveTextContent('This could introduce breaking changes');
        expect(callout).toHaveTextContent('test.number were in an approved version');
      });

      it('asks for confirmation before saving and resends with the acknowledgement', async () => {
        const onClose = jest.fn();
        render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

        await userEvent.click(screen.getByTestId('code-editor-change'));
        await userEvent.click(screen.getByTestId('editPipelineFlyoutSaveButton'));

        const modal = await screen.findByTestId('editPipelineFlyoutBreakingChangesModal');
        expect(modal).toHaveTextContent('Save changes that could break existing data?');
        expect(modal).toHaveTextContent('test.number');
        expect(onClose).not.toHaveBeenCalled();

        await userEvent.click(within(modal).getByRole('button', { name: 'Save anyway' }));

        expect(mockApplyEdits).toHaveBeenLastCalledWith(
          expect.objectContaining({ dryRun: false, acknowledgeBreakingChanges: true })
        );
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('keeps the draft when the confirmation is cancelled', async () => {
        const onClose = jest.fn();
        render(<EditPipelineFlyout {...defaultProps} onClose={onClose} />);

        await userEvent.click(screen.getByTestId('code-editor-change'));
        await userEvent.click(screen.getByTestId('editPipelineFlyoutSaveButton'));
        const modal = await screen.findByTestId('editPipelineFlyoutBreakingChangesModal');

        await userEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

        expect(
          screen.queryByTestId('editPipelineFlyoutBreakingChangesModal')
        ).not.toBeInTheDocument();
        expect(screen.getByTestId('code-editor')).toHaveTextContent('"updated"');
        expect(mockApplyEdits).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
      });
    });

    it('does not sync drafts when switching tabs on a read-only data stream', async () => {
      mockUIState.selectedPipelineTab = 'pipeline';
      render(<EditPipelineFlyout {...defaultProps} editState="reanalyzing" />);

      await userEvent.click(screen.getByRole('tab', { name: 'Table' }));

      await waitFor(() => expect(mockSelectPipelineTab).toHaveBeenCalledWith('table'));
      expect(mockApplyEdits).not.toHaveBeenCalled();
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

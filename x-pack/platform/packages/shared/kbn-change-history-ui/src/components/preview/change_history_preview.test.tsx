/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { monaco } from '@kbn/code-editor';
import type { ChangeHistoryConfigValue } from '../../provider/change_history_config_context';
import { ChangeHistoryConfigContext } from '../../provider/change_history_config_context';
import type { ChangeHistoryDetail, ChangeHistoryListItem } from '../../types';
import { TestProvider } from '../../test_utils/test_providers';
import type { ChangeHistoryPreviewEditorContext } from './change_history_preview';
import { ChangeHistoryPreview } from './change_history_preview';
import { ChangeHistoryPreviewSettingsSection } from './change_history_preview_settings_popover';

const detail: ChangeHistoryDetail = {
  id: 'change-1',
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'update',
  snapshot: {},
};

const mockFooterContext = jest.fn();

const renderFooter = (context: ChangeHistoryPreviewEditorContext | null) => {
  mockFooterContext(context);
  return <div data-test-subj="footerSlot">Custom footer</div>;
};

const mockYamlModel = {
  getLineLength: jest.fn(() => 10),
  getLineCount: jest.fn(() => 1),
  getValue: jest.fn(() => 'name: current\n'),
  uri: { toString: () => 'inmemory://model/current.yaml' },
};

const mockRevealLineInCenter = jest.fn();
const mockRevealLinesInCenter = jest.fn();
const mockSetPosition = jest.fn();
const mockDiffUpdateOptions = jest.fn();
const mockOriginalUpdateOptions = jest.fn();
const mockModifiedUpdateOptions = jest.fn();
const onDidUpdateDiffCallbacks: Array<() => void> = [];
let mockLineChanges: Array<{
  originalStartLineNumber: number;
  originalEndLineNumber: number;
  modifiedStartLineNumber: number;
  modifiedEndLineNumber: number;
}> = [
  {
    originalStartLineNumber: 10,
    originalEndLineNumber: 10,
    modifiedStartLineNumber: 12,
    modifiedEndLineNumber: 12,
  },
];

jest.mock('@kbn/code-editor', () => {
  const actual = jest.requireActual('@kbn/code-editor');

  return {
    ...actual,
    monaco: {
      ...actual.monaco,
      editor: {
        ...actual.monaco.editor,
        defineTheme: jest.fn(),
        createModel: jest.fn((value: string, language: string) => ({
          value,
          language,
          dispose: jest.fn(),
        })),
        create: jest.fn(() => ({
          dispose: jest.fn(),
          layout: jest.fn(),
          getModel: jest.fn(() => mockYamlModel),
          updateOptions: jest.fn(),
          createDecorationsCollection: jest.fn(() => ({ clear: jest.fn() })),
        })),
        createDiffEditor: jest.fn(() => ({
          setModel: jest.fn(),
          dispose: jest.fn(),
          layout: jest.fn(),
          updateOptions: mockDiffUpdateOptions,
          getLineChanges: jest.fn(() => mockLineChanges),
          onDidUpdateDiff: jest.fn((listener: () => void) => {
            onDidUpdateDiffCallbacks.push(listener);
            return { dispose: jest.fn() };
          }),
          setPosition: mockSetPosition,
          revealLineInCenter: mockRevealLineInCenter,
          revealLinesInCenter: mockRevealLinesInCenter,
          getOriginalEditor: jest.fn(() => ({ updateOptions: mockOriginalUpdateOptions })),
          getModifiedEditor: jest.fn(() => ({
            updateOptions: mockModifiedUpdateOptions,
            revealLineInCenter: jest.fn(),
            getModel: jest.fn(() => mockYamlModel),
            createDecorationsCollection: jest.fn(() => ({ clear: jest.fn() })),
          })),
        })),
        setModelMarkers: jest.fn(),
        onDidChangeMarkers: jest.fn(() => ({ dispose: jest.fn() })),
      },
    },
  };
});

const mockCreateEditor = monaco.editor.create as jest.Mock;
const mockCreateDiffEditor = monaco.editor.createDiffEditor as jest.Mock;

const renderPreview = (props: React.ComponentProps<typeof ChangeHistoryPreview>) =>
  render(
    <TestProvider>
      <ChangeHistoryPreview language="yaml" {...props} />
    </TestProvider>
  );

describe('ChangeHistoryPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFooterContext.mockClear();
    onDidUpdateDiffCallbacks.length = 0;
    mockLineChanges = [
      {
        originalStartLineNumber: 10,
        originalEndLineNumber: 10,
        modifiedStartLineNumber: 12,
        modifiedEndLineNumber: 12,
      },
    ];
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders a read-only editor when no compare yaml is provided', () => {
    jest.useFakeTimers();
    renderPreview({ target: 'name: current\n' });

    expect(screen.getByTestId('changeHistoryMonacoPreview')).toBeInTheDocument();
    expect(mockCreateEditor).toHaveBeenCalled();
    expect(mockCreateDiffEditor).not.toHaveBeenCalled();
    expect(screen.queryByTestId('changeHistoryPreviewSettingsButton')).not.toBeInTheDocument();
  });

  it('renders a diff editor when compare yaml is identical', () => {
    jest.useFakeTimers();
    mockLineChanges = [];
    renderPreview({
      target: 'name: same\n',
      baseline: 'name: same\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(mockCreateEditor).not.toHaveBeenCalled();
    expect(screen.getByTestId('changeHistoryDiffNavigator')).toHaveTextContent('No changes');
  });

  it('shows the comparing-with indicator when identical versions are compared', () => {
    jest.useFakeTimers();
    mockLineChanges = [];
    renderPreview({
      target: 'name: same\n',
      baseline: 'name: same\n',
      compareSpec: {
        comparisonType: 'vs_previous',
        baseline: { ...detail, action: 'baseline-action' },
        target: { ...detail, action: 'target-action' },
      },
    });

    expect(screen.getByTestId('changeHistoryCompareIndicator')).toBeInTheDocument();
    expect(screen.getByText('Comparing with:')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryCompareIndicator')).toHaveTextContent(
      'baseline-action'
    );
    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(screen.getByTestId('changeHistoryDiffNavigator')).toHaveTextContent('No changes');

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));
    expect(screen.getByTestId('changeHistoryCompareUnified')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryCompareSplit')).toBeInTheDocument();
  });

  it('renders a diff editor when compare yaml is empty and current yaml is not', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: v2\n',
      baseline: '',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(mockCreateEditor).not.toHaveBeenCalled();
    expect(monaco.editor.createModel).toHaveBeenCalledWith('', 'yaml');

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));

    expect(screen.getByTestId('changeHistoryCompareUnified')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryCompareSplit')).toBeInTheDocument();
  });

  it('calls reportDiffViewed when compare yaml differs', () => {
    jest.useFakeTimers();
    const reportDiffViewed = jest.fn();

    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
      diffTelemetry: {
        compareMode: 'unified',
        setCompareMode: jest.fn(),
        reportDiffViewed,
        reportDiffChangeNavigated: jest.fn(),
      },
    });

    expect(reportDiffViewed).toHaveBeenCalledTimes(1);
  });

  it('does not call reportDiffViewed when compare yaml is identical', () => {
    jest.useFakeTimers();
    const reportDiffViewed = jest.fn();
    mockLineChanges = [];

    renderPreview({
      target: 'name: same\n',
      baseline: 'name: same\n',
      diffTelemetry: {
        compareMode: 'unified',
        setCompareMode: jest.fn(),
        reportDiffViewed,
        reportDiffChangeNavigated: jest.fn(),
      },
    });

    expect(reportDiffViewed).not.toHaveBeenCalled();
  });

  it('renders a diff editor when compare yaml differs', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();
    expect(mockCreateDiffEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lineNumbers: 'on', renderSideBySide: false })
    );
    expect(mockOriginalUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ lineNumbers: 'off' })
    );
    expect(mockModifiedUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ lineNumbers: 'on' })
    );
    expect(mockCreateEditor).not.toHaveBeenCalled();
    expect(screen.getByTestId('changeHistoryDiffNavigator')).toHaveTextContent('1 of 1 changes');
    expect(screen.getByTestId('changeHistoryPreviewSettingsButton')).toBeInTheDocument();
  });

  it('shows the comparing-with indicator when compare labels are provided', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
      compareSpec: {
        comparisonType: 'vs_previous',
        baseline: { ...detail, action: 'baseline-action' },
        target: { ...detail, action: 'target-action' },
      },
    });

    expect(screen.getByTestId('changeHistoryCompareIndicator')).toBeInTheDocument();
    expect(screen.getByText('Comparing with:')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryCompareIndicator')).toHaveTextContent(
      'baseline-action'
    );
  });

  it('shows split pane labels when compare mode is split', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
      compareSpec: {
        comparisonType: 'vs_previous',
        baseline: { ...detail, action: 'baseline-action' },
        target: { ...detail, action: 'target-action' },
      },
    });

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('changeHistoryCompareSplit'));

    expect(screen.getByTestId('changeHistoryCompareSplitPaneLabels')).toBeInTheDocument();
    expect(screen.getByText('Previous version:')).toBeInTheDocument();
    expect(screen.getByText('Selected version:')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryCompareSplitPaneLabels')).toHaveTextContent(
      'baseline-action'
    );
    expect(screen.getByTestId('changeHistoryCompareSplitPaneLabels')).toHaveTextContent(
      'target-action'
    );
    expect(screen.queryByTestId('changeHistoryCompareIndicator')).not.toBeInTheDocument();
  });

  it('renders the host renderBadge for each compared row', () => {
    jest.useFakeTimers();
    render(
      <TestProvider>
        <ChangeHistoryConfigContext.Provider
          value={
            {
              renderBadge: ({ item }: { item: ChangeHistoryListItem }) => `custom:${item.action}`,
            } as ChangeHistoryConfigValue
          }
        >
          <ChangeHistoryPreview
            target="name: draft\n"
            baseline="name: original\n"
            compareSpec={{
              comparisonType: 'vs_previous',
              baseline: { ...detail, action: 'baseline-action' },
              target: { ...detail, action: 'target-action' },
            }}
          />
        </ChangeHistoryConfigContext.Provider>
      </TestProvider>
    );

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('changeHistoryCompareSplit'));

    const labels = screen.getByTestId('changeHistoryCompareSplitPaneLabels');
    expect(labels).toHaveTextContent('custom:baseline-action');
    expect(labels).toHaveTextContent('custom:target-action');
  });

  it('scrolls to the first diff when diff computation completes', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\nsteps:\n  - name: updated\n',
      baseline: 'name: original\nsteps:\n  - name: old\n',
    });

    expect(onDidUpdateDiffCallbacks).toHaveLength(1);
    act(() => {
      onDidUpdateDiffCallbacks[0]();
    });

    expect(mockSetPosition).toHaveBeenCalledWith({ lineNumber: 12, column: 1 });
    expect(mockRevealLineInCenter).toHaveBeenCalledWith(12);
  });

  it('updates diff layout via updateOptions when compare mode changes', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
    });

    expect(mockCreateDiffEditor).toHaveBeenCalled();

    const createCallsBeforeToggle = mockCreateDiffEditor.mock.calls.length;

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('changeHistoryCompareSplit'));

    expect(mockDiffUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ renderSideBySide: true, renderIndicators: true })
    );
    expect(mockCreateDiffEditor.mock.calls.length).toBe(createCallsBeforeToggle);
  });

  it('keeps settings popover open when switching compare mode', () => {
    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
    });

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));
    fireEvent.click(screen.getByTestId('changeHistoryCompareSplit'));

    expect(screen.getByTestId('changeHistoryCompareUnified')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryCompareSplit')).toBeInTheDocument();
  });

  it('moves compare mode selection and focus with arrow keys', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
    });

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));

    const unifiedTile = screen.getByTestId('changeHistoryCompareUnified');
    const splitTile = screen.getByTestId('changeHistoryCompareSplit');

    unifiedTile.focus();
    expect(unifiedTile).toHaveFocus();

    fireEvent.keyDown(unifiedTile, { key: 'ArrowRight' });

    expect(splitTile).toHaveFocus();
    expect(mockDiffUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ renderSideBySide: true, renderIndicators: true })
    );
  });

  it('serializes objects as pretty JSON and defaults the language to json', () => {
    jest.useFakeTimers();
    render(
      <TestProvider>
        <ChangeHistoryPreview baseline={{ a: 1 }} target={{ a: 2 }} />
      </TestProvider>
    );

    expect(monaco.editor.createModel).toHaveBeenCalledWith('{\n  "a": 1\n}', 'json');
    expect(monaco.editor.createModel).toHaveBeenCalledWith('{\n  "a": 2\n}', 'json');
  });

  it('registers and uses the EUI theme by default', () => {
    jest.useFakeTimers();
    renderPreview({ target: 'name: current\n' });

    expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
      'change-history-eui',
      expect.objectContaining({
        colors: expect.objectContaining({ 'editor.background': '#00000000' }),
      })
    );
    expect(mockCreateEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ theme: 'change-history-eui' })
    );
  });

  it('renders no settings in single mode by default', () => {
    jest.useFakeTimers();
    renderPreview({ target: 'name: current\n' });

    expect(screen.queryByTestId('changeHistoryPreviewSettingsButton')).not.toBeInTheDocument();
  });

  it('shows only the compare mode setting in the default settings popover', () => {
    jest.useFakeTimers();
    renderPreview({ target: 'name: current\n', baseline: 'name: original\n' });

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));

    expect(screen.getByTestId('changeHistoryCompareUnified')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryCompareSplit')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryPreviewSettingsButton')).toHaveAttribute(
      'aria-label',
      'Settings'
    );
  });

  it('renders extra settings below the compare mode setting and keeps them open on change', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\n',
      baseline: 'name: original\n',
      extraSettings: (
        <ChangeHistoryPreviewSettingsSection>
          <span data-test-subj="customSetting">My setting</span>
        </ChangeHistoryPreviewSettingsSection>
      ),
    });

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));

    expect(
      screen.getAllByText(/Comparison mode|My setting/).map((element) => element.textContent)
    ).toEqual(['Comparison mode', 'My setting']);

    fireEvent.click(screen.getByTestId('changeHistoryCompareSplit'));

    expect(screen.getByTestId('customSetting')).toBeInTheDocument();
    expect(mockDiffUpdateOptions).toHaveBeenCalledWith(
      expect.objectContaining({ renderSideBySide: true })
    );
  });

  it('shows extra settings without the compare mode setting in single mode', () => {
    jest.useFakeTimers();
    renderPreview({
      target: 'name: current\n',
      extraSettings: (
        <ChangeHistoryPreviewSettingsSection>
          <span data-test-subj="customSetting">My setting</span>
        </ChangeHistoryPreviewSettingsSection>
      ),
    });

    fireEvent.click(screen.getByTestId('changeHistoryPreviewSettingsButton'));

    expect(screen.getByTestId('customSetting')).toBeInTheDocument();
    expect(screen.queryByTestId('changeHistoryCompareUnified')).not.toBeInTheDocument();
  });

  it('renders the footer slot with the editor context', () => {
    jest.useFakeTimers();
    renderPreview({ target: 'name: current\n', renderFooter });

    expect(screen.getByTestId('footerSlot')).toBeInTheDocument();
    expect(mockFooterContext).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isEditorMounted: true,
        getActiveEditor: expect.any(Function),
        configureDiffEditors: expect.any(Function),
        decorationsRef: expect.any(Object),
      })
    );
  });

  it('applies editorOptions to the editor on creation and when they change', () => {
    jest.useFakeTimers();
    const first = { hover: { enabled: 'on' as const } };
    const { rerender } = renderPreview({ target: 'name: current\n', editorOptions: first });

    expect(mockCreateEditor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ hover: { enabled: 'on' } })
    );

    const updateOptions = mockCreateEditor.mock.results[0].value.updateOptions as jest.Mock;
    const second = { hover: { enabled: 'off' as const } };
    rerender(
      <TestProvider>
        <ChangeHistoryPreview language="yaml" target={'name: current\n'} editorOptions={second} />
      </TestProvider>
    );

    expect(updateOptions).toHaveBeenCalledWith(second);
  });

  it('applies editorOptions to a diff editor and both panes', () => {
    jest.useFakeTimers();
    const editorOptions = { renderValidationDecorations: 'on' as const };
    renderPreview({ target: 'b', baseline: 'a', editorOptions });

    expect(mockDiffUpdateOptions).toHaveBeenCalledWith(editorOptions);
    expect(mockOriginalUpdateOptions).toHaveBeenCalledWith(expect.objectContaining(editorOptions));
    expect(mockModifiedUpdateOptions).toHaveBeenCalledWith(expect.objectContaining(editorOptions));
  });
});

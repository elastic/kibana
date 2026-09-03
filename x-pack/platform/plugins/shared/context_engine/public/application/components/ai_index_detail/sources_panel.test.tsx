/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { AiIndexSource, GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type {
  UseDataConnectorsOptions,
  UseDataConnectorsResult,
} from '../../hooks/use_data_connectors';
import { useSuggestAutomation } from '../../hooks/use_suggest_automation';
import type { UseSuggestAutomationResult } from '../../hooks/use_suggest_automation';
import { SourcesPanel } from './sources_panel';

const mockUseDataConnectors = jest.fn(
  (_options?: UseDataConnectorsOptions): UseDataConnectorsResult => ({
    connectors: [{ id: 'connector-gdrive', name: 'Google Drive', actionTypeId: '.google_drive' }],
    connectorNameById: new Map([['connector-gdrive', 'Google Drive']]),
    connectorActionTypeById: new Map([['connector-gdrive', '.google_drive']]),
    isLoading: false,
    isError: false,
    error: undefined,
  })
);

jest.mock('../../hooks/use_data_connectors', () => ({
  useDataConnectors: (options?: UseDataConnectorsOptions) => mockUseDataConnectors(options),
}));

jest.mock('../../hooks/use_suggest_automation');

const mockUseSuggestAutomation = jest.mocked(useSuggestAutomation);

const suggestResult = (
  overrides: Partial<UseSuggestAutomationResult> = {}
): UseSuggestAutomationResult => ({
  canSuggest: false,
  suggestAutomation: jest.fn(),
  startGuidedSetup: jest.fn(),
  ...overrides,
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider
          services={{
            ...coreMock.createStart(),
            triggersActionsUi: triggersActionsUiMock.createStart(),
          }}
        >
          {ui}
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

const sources: AiIndexSource[] = [
  { type: 'esql', value: 'FROM a' },
  { type: 'esql', value: 'FROM b' },
  { type: 'esql', value: 'FROM c' },
];

const buildAiIndex = (aiIndexSources: AiIndexSource[]): GetAiIndexResponse => ({
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'index', value: 'ai-index-idx-my-ai-index' },
  automations: [],
  sources: aiIndexSources,
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
});

const renderPanel = (props: Partial<React.ComponentProps<typeof SourcesPanel>> = {}) =>
  renderWithProviders(
    <SourcesPanel
      isLoading={false}
      aiIndex={buildAiIndex(sources)}
      canEdit
      onEditSources={jest.fn()}
      onSaved={jest.fn()}
      isManaged={false}
      {...props}
    />
  );

describe('SourcesPanel', () => {
  beforeEach(() => {
    mockUseDataConnectors.mockClear();
    mockUseSuggestAutomation.mockReset();
    mockUseSuggestAutomation.mockReturnValue(suggestResult());
  });

  it('shows the loading skeleton while loading and no rows', () => {
    renderPanel({ isLoading: true, aiIndex: undefined, canEdit: false });

    expect(screen.getByTestId('contextAiIndexSourcesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
  });

  it('shows the empty message when not loading and there are no sources', () => {
    renderPanel({ aiIndex: buildAiIndex([]) });

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(
      screen.getByText('No sources yet. Add a source to start building context for this AI index.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
  });

  it('shows read-only empty copy for managed AI indexes with no sources', () => {
    renderPanel({ aiIndex: buildAiIndex([]), isManaged: true });

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(screen.getByText('This AI index has no sources.')).toBeInTheDocument();
  });

  it('offers guided setup when the index has no sources and the assistant is available', () => {
    const startGuidedSetup = jest.fn();
    mockUseSuggestAutomation.mockReturnValue(suggestResult({ canSuggest: true, startGuidedSetup }));

    renderPanel({ aiIndex: buildAiIndex([]) });

    fireEvent.click(screen.getByTestId('contextSetUpAiIndexButton'));
    expect(startGuidedSetup).toHaveBeenCalledTimes(1);
  });

  it('does not offer guided setup once the index has sources', () => {
    mockUseSuggestAutomation.mockReturnValue(suggestResult({ canSuggest: true }));

    renderPanel();

    expect(screen.queryByTestId('contextSetUpAiIndexButton')).not.toBeInTheDocument();
  });

  it('does not offer guided setup when the assistant is unavailable', () => {
    renderPanel({ aiIndex: buildAiIndex([]) });

    expect(screen.queryByTestId('contextSetUpAiIndexButton')).not.toBeInTheDocument();
  });

  it('does not offer guided setup for managed AI indexes', () => {
    mockUseSuggestAutomation.mockReturnValue(suggestResult({ canSuggest: true }));

    renderPanel({ aiIndex: buildAiIndex([]), isManaged: true });

    expect(screen.queryByTestId('contextSetUpAiIndexButton')).not.toBeInTheDocument();
  });

  it('renders one row per source', () => {
    renderPanel();

    expect(screen.getAllByTestId('contextAiIndexSourceRow')).toHaveLength(sources.length);
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
  });

  it('does not fetch connectors when there are no connector sources', () => {
    renderPanel();

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: false });
  });

  it('fetches connectors when at least one source is a connector', () => {
    renderPanel({ aiIndex: buildAiIndex([{ type: 'connector', value: 'connector-gdrive' }]) });

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: true });
  });

  it('resolves the connector name for connector sources', () => {
    renderPanel({ aiIndex: buildAiIndex([{ type: 'connector', value: 'connector-gdrive' }]) });

    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent('Google Drive');
  });

  it('disables the edit button when editing is not allowed', () => {
    renderPanel({ canEdit: false });

    expect(screen.getByTestId('contextEditSourcesButton')).toBeDisabled();
  });

  it('hides the edit button for managed AI indexes', () => {
    renderPanel({ isManaged: true });

    expect(screen.queryByTestId('contextEditSourcesButton')).not.toBeInTheDocument();
  });

  it('calls onEditSources when the edit button is clicked', () => {
    const onEditSources = jest.fn();
    renderPanel({ onEditSources });

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    expect(onEditSources).toHaveBeenCalledTimes(1);
  });
});

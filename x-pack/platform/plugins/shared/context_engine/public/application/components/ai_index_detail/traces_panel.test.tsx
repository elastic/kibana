/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { TracesPanel } from './traces_panel';

const mockPutFeedbackAnalysis = jest.fn();
const mockRunFeedbackAnalysis = jest.fn();
const mockFeedbackLoopEnabled = jest.fn();
const mockToasts = { addSuccess: jest.fn(), addError: jest.fn(), addWarning: jest.fn() };

jest.mock('../../api/ai_indices', () => ({
  putAiIndexFeedbackAnalysis: (...args: unknown[]) => mockPutFeedbackAnalysis(...args),
}));

jest.mock('../../api/improvements', () => ({
  runFeedbackAnalysis: (...args: unknown[]) => mockRunFeedbackAnalysis(...args),
}));

jest.mock('../../hooks/use_feedback_loop_enabled', () => ({
  useFeedbackLoopEnabled: () => mockFeedbackLoopEnabled(),
}));

jest.mock('../../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => ({
    agents: [{ id: 'support-agent', name: 'Support agent' }],
    isLoading: false,
    error: undefined,
  }),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      notifications: { toasts: mockToasts },
      getChatOpener: () => undefined,
    },
  }),
}));

const buildAiIndex = (feedbackAnalysis?: { enabled: boolean }): GetAiIndexResponse =>
  ({
    id: 'my-ai-index',
    sources: [],
    automations: [],
    managed: false,
    ...(feedbackAnalysis ? { feedback_analysis: feedbackAnalysis } : {}),
  } as unknown as GetAiIndexResponse);

const renderPanel = ({
  aiIndex = buildAiIndex(),
  isLoading = false,
}: { aiIndex?: GetAiIndexResponse; isLoading?: boolean } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <TracesPanel isLoading={isLoading} aiIndex={aiIndex} />
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('TracesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeedbackLoopEnabled.mockReturnValue(true);
    mockPutFeedbackAnalysis.mockResolvedValue({});
    mockRunFeedbackAnalysis.mockResolvedValue({ execution_id: 'execution-1' });
  });

  describe('trace selection', () => {
    it('offers agents by default and data streams on the other tab', () => {
      renderPanel();

      expect(screen.getByTestId('contextTracesAgentPicker')).toBeInTheDocument();
      expect(screen.queryByTestId('contextTracesDataStreamPicker')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('index'));

      expect(screen.getByTestId('contextTracesDataStreamPicker')).toBeInTheDocument();
      expect(screen.queryByTestId('contextTracesAgentPicker')).not.toBeInTheDocument();
    });

    it('says that the selection is not saved, because nothing here writes', () => {
      renderPanel();

      expect(screen.getByTestId('contextTracesDraftNote')).toBeInTheDocument();
    });

    it('shows a skeleton rather than empty pickers while the index loads', () => {
      renderPanel({ isLoading: true });

      expect(screen.getByTestId('contextTracesLoading')).toBeInTheDocument();
      expect(screen.queryByTestId('contextTracesSourceKind')).not.toBeInTheDocument();
    });
  });

  describe('automatic improvements', () => {
    it('turns analysis on for this index', async () => {
      renderPanel();

      fireEvent.click(screen.getByTestId('contextTracesAutoImproveSwitch'));

      await waitFor(() =>
        expect(mockPutFeedbackAnalysis).toHaveBeenCalledWith(
          {},
          {
            aiIndexId: 'my-ai-index',
            feedbackAnalysis: expect.objectContaining({ enabled: true }),
          }
        )
      );
    });

    it('turns it back off', async () => {
      renderPanel({ aiIndex: buildAiIndex({ enabled: true }) });

      fireEvent.click(screen.getByTestId('contextTracesAutoImproveSwitch'));

      await waitFor(() =>
        expect(mockPutFeedbackAnalysis).toHaveBeenCalledWith(
          {},
          {
            aiIndexId: 'my-ai-index',
            feedbackAnalysis: expect.objectContaining({ enabled: false }),
          }
        )
      );
    });

    it('offers no manual run until analysis is on, since there is no workflow to run', () => {
      renderPanel();

      expect(screen.queryByTestId('contextImprovementsRunNowButton')).not.toBeInTheDocument();
    });

    it('offers one once it is', async () => {
      renderPanel({ aiIndex: buildAiIndex({ enabled: true }) });

      fireEvent.click(screen.getByTestId('contextImprovementsRunNowButton'));

      await waitFor(() =>
        expect(mockRunFeedbackAnalysis).toHaveBeenCalledWith({}, { aiIndexId: 'my-ai-index' })
      );
    });

    it('says a run is already going rather than claiming this one started', async () => {
      // The workflow runs one analysis per index at a time and discards the rest. A success toast
      // here would promise improvements from a run that was thrown away.
      mockRunFeedbackAnalysis.mockRejectedValue(
        Object.assign(new Error('Feedback analysis is already running'), {
          body: { statusCode: 409 },
        })
      );

      renderPanel({ aiIndex: buildAiIndex({ enabled: true }) });

      fireEvent.click(screen.getByTestId('contextImprovementsRunNowButton'));

      await waitFor(() => expect(mockToasts.addWarning).toHaveBeenCalled());
      expect(mockToasts.addError).not.toHaveBeenCalled();
      expect(mockToasts.addSuccess).not.toHaveBeenCalled();
    });

    it('still reports a run that genuinely failed as an error', async () => {
      mockRunFeedbackAnalysis.mockRejectedValue(new Error('workflows unavailable'));

      renderPanel({ aiIndex: buildAiIndex({ enabled: true }) });

      fireEvent.click(screen.getByTestId('contextImprovementsRunNowButton'));

      await waitFor(() => expect(mockToasts.addError).toHaveBeenCalled());
      expect(mockToasts.addWarning).not.toHaveBeenCalled();
    });

    it('leaves the agent, interval and signal window to their defaults', () => {
      // They are per-index overrides of settings that already have server-side defaults, so the
      // API keeps taking them while the page stays down to the decision that matters.
      renderPanel({ aiIndex: buildAiIndex({ enabled: true }) });

      expect(screen.queryByTestId('contextImprovementsIntervalSelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contextImprovementsSignalWindowSelect')).not.toBeInTheDocument();
      expect(screen.queryByTestId('contextFeedbackAgentSelect')).not.toBeInTheDocument();
    });

    it('is absent while the feedback loop is off, though traces stay selectable', () => {
      mockFeedbackLoopEnabled.mockReturnValue(false);

      renderPanel();

      expect(screen.queryByTestId('contextTracesAutoImproveSwitch')).not.toBeInTheDocument();
      expect(screen.getByTestId('contextTracesSourceKind')).toBeInTheDocument();
    });
  });
});

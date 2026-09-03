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
import type { Improvement } from '../../../../common/http_api/improvements';
import { buildImprovement } from './improvement_test_fixtures';
import { ImprovementsPanel } from './improvements_panel';

const mockListImprovements = jest.fn();
const mockApproveImprovement = jest.fn();
const mockRejectImprovement = jest.fn();
const mockRunFeedbackAnalysis = jest.fn();
const mockPutFeedbackAnalysis = jest.fn();
const mockChatOpener = jest.fn();
const mockFeedbackLoopEnabled = jest.fn();
const mockToasts = {
  addSuccess: jest.fn(),
  addError: jest.fn(),
  addWarning: jest.fn(),
};

jest.mock('../../api/improvements', () => ({
  listImprovements: (...args: unknown[]) => mockListImprovements(...args),
  approveImprovement: (...args: unknown[]) => mockApproveImprovement(...args),
  rejectImprovement: (...args: unknown[]) => mockRejectImprovement(...args),
  runFeedbackAnalysis: (...args: unknown[]) => mockRunFeedbackAnalysis(...args),
}));

jest.mock('../../api/ai_indices', () => ({
  putAiIndexFeedbackAnalysis: (...args: unknown[]) => mockPutFeedbackAnalysis(...args),
}));

jest.mock('../../hooks/use_feedback_loop_enabled', () => ({
  useFeedbackLoopEnabled: () => mockFeedbackLoopEnabled(),
}));

// Both pull in Agent Builder services this panel does not otherwise need.
jest.mock('./feedback_agent_selector', () => ({
  FeedbackAgentSelector: () => <div data-test-subj="contextFeedbackAgentSelector" />,
}));

jest.mock('./signal_group_flyout', () => ({
  SignalGroupFlyout: ({ group }: { group: { tag: string } }) => (
    <div data-test-subj="contextSignalGroupFlyout">{group.tag}</div>
  ),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      notifications: { toasts: mockToasts },
      getChatOpener: () => mockChatOpener,
    },
  }),
}));

const buildAiIndex = ({ enabled = true }: { enabled?: boolean } = {}): GetAiIndexResponse =>
  ({
    id: 'my-ai-index',
    description: 'Support docs',
    dest: 'ki-my-ai-index',
    sources: [],
    automations: [],
    managed: false,
    feedback_analysis: {
      enabled,
      agent_id: 'analysis-agent',
      schedule: { interval: '24h' },
      signal_time_range: { type: 'relative', from: 'now-30d' },
    },
  } as unknown as GetAiIndexResponse);

const renderPanel = (aiIndex = buildAiIndex()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ImprovementsPanel isLoading={false} aiIndex={aiIndex} />
      </QueryClientProvider>
    </I18nProvider>
  );
};

/** The panel lists open and decided improvements separately, so both calls need an answer. */
const resolveList = ({
  open = [],
  history = [],
}: { open?: Improvement[]; history?: Improvement[] } = {}) => {
  mockListImprovements.mockImplementation((_http, { status }) => {
    const items = status?.includes('applied') ? history : open;
    return Promise.resolve({ items, total: items.length });
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFeedbackLoopEnabled.mockReturnValue(true);
  resolveList({ open: [buildImprovement()] });
});

describe('ImprovementsPanel', () => {
  it('lists the improvements awaiting a decision', async () => {
    renderPanel();

    expect(await screen.findByText('Document the refund window')).toBeInTheDocument();
  });

  it('stays out of the way entirely when the feedback loop is off', () => {
    mockFeedbackLoopEnabled.mockReturnValue(false);
    renderPanel();

    expect(screen.queryByTestId('contextImprovementsPanel')).not.toBeInTheDocument();
    expect(mockListImprovements).not.toHaveBeenCalled();
  });

  it('explains the empty queue rather than showing a blank panel', async () => {
    resolveList();
    renderPanel();

    expect(await screen.findByTestId('contextImprovementsEmpty')).toHaveTextContent(
      'Suggestions appear here after an analysis run'
    );
  });

  it('points at the off switch when nothing is scheduled to produce suggestions', async () => {
    resolveList();
    renderPanel(buildAiIndex({ enabled: false }));

    expect(await screen.findByTestId('contextImprovementsEmpty')).toHaveTextContent(
      'Turn on scheduled analysis'
    );
  });

  it('says so when the improvements cannot be read at all', async () => {
    mockListImprovements.mockRejectedValue(new Error('forbidden'));
    renderPanel();

    expect(await screen.findByTestId('contextImprovementsError')).toHaveTextContent(
      'Unable to load improvements'
    );
  });

  it('approves the improvement whose button was pressed', async () => {
    mockApproveImprovement.mockResolvedValue({
      improvement: buildImprovement({ status: 'applied' }),
    });
    renderPanel();

    fireEvent.click(await screen.findByTestId('contextImprovementApproveButton'));

    await waitFor(() =>
      expect(mockApproveImprovement).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ aiIndexId: 'my-ai-index', improvementId: 'imp-1' })
      )
    );
  });

  it('treats a decision someone else made first as news, not as an error', async () => {
    mockApproveImprovement.mockRejectedValue(
      Object.assign(new Error('Conflict'), { body: { statusCode: 409 } })
    );
    renderPanel();

    fireEvent.click(await screen.findByTestId('contextImprovementApproveButton'));

    await waitFor(() =>
      expect(mockToasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('decided this improvement first'),
        })
      )
    );
    expect(mockToasts.addError).not.toHaveBeenCalled();
  });

  it('surfaces a failed apply as an error the reviewer can act on', async () => {
    mockApproveImprovement.mockRejectedValue(new Error('Destination is a pattern'));
    renderPanel();

    fireEvent.click(await screen.findByTestId('contextImprovementApproveButton'));

    await waitFor(() => expect(mockToasts.addError).toHaveBeenCalled());
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
  });

  it('rejects an improvement', async () => {
    mockRejectImprovement.mockResolvedValue({
      improvement: buildImprovement({ status: 'rejected' }),
    });
    renderPanel();

    fireEvent.click(await screen.findByTestId('contextImprovementRejectButton'));

    await waitFor(() =>
      expect(mockRejectImprovement).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ improvementId: 'imp-1' })
      )
    );
  });

  it('opens the agent on the improvement being discussed', async () => {
    renderPanel();

    fireEvent.click(await screen.findByTestId('contextImprovementTalkButton'));

    expect(mockChatOpener).toHaveBeenCalledWith(
      expect.objectContaining({
        improvement: expect.objectContaining({ improvement_id: 'imp-1' }),
      })
    );
  });

  it('drills from an improvement into the signals behind it', async () => {
    renderPanel();

    fireEvent.click(await screen.findByTestId('contextImprovementViewSignalsButton'));

    expect(screen.getByTestId('contextSignalGroupFlyout')).toHaveTextContent('coverage_gap');
  });

  it('runs an analysis on demand', async () => {
    mockRunFeedbackAnalysis.mockResolvedValue({ execution_id: 'exec-1' });
    renderPanel();

    fireEvent.click(await screen.findByTestId('contextImprovementsRunNowButton'));

    await waitFor(() =>
      expect(mockRunFeedbackAnalysis).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ aiIndexId: 'my-ai-index' })
      )
    );
  });

  it('cannot run an analysis that is turned off, since nothing is installed to run', async () => {
    renderPanel(buildAiIndex({ enabled: false }));

    expect(await screen.findByTestId('contextImprovementsRunNowButton')).toBeDisabled();
  });

  it('turns scheduled analysis on without dropping the rest of the configuration', async () => {
    mockPutFeedbackAnalysis.mockResolvedValue({ feedback_analysis: { enabled: true } });
    renderPanel(buildAiIndex({ enabled: false }));

    fireEvent.click(await screen.findByTestId('contextImprovementsEnabledSwitch'));

    await waitFor(() =>
      expect(mockPutFeedbackAnalysis).toHaveBeenCalledWith(expect.anything(), {
        aiIndexId: 'my-ai-index',
        feedbackAnalysis: expect.objectContaining({
          enabled: true,
          agent_id: 'analysis-agent',
          schedule: { interval: '24h' },
        }),
      })
    );
  });

  it('keeps decided improvements out of the queue, behind history', async () => {
    resolveList({
      open: [buildImprovement()],
      history: [
        buildImprovement({
          improvement_id: 'imp-2',
          status: 'applied',
          title: 'Already applied',
        }),
      ],
    });
    renderPanel();

    const history = await screen.findByTestId('contextImprovementsHistory');
    expect(history).toHaveTextContent('1 decided improvement');
    expect(screen.getByTestId('contextImprovementsOpen')).not.toHaveTextContent('Already applied');
  });
});

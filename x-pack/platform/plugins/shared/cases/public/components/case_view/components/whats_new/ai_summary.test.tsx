/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../common/mock';
import * as api from '../../../../containers/api';
import { WhatsNewPanel } from './whats_new_panel';
import { useGetCaseDelta } from './use_get_case_delta';

jest.mock('./use_get_case_delta');
jest.mock('../../../../containers/api');

const useGetCaseDeltaMock = jest.mocked(useGetCaseDelta);
const getCaseDeltaSummarySpy = jest.spyOn(api, 'getCaseDeltaSummary');

const counts = { alerts: 0, comments: 1, changes: 1, evidence: 0 };

const summaryResponse = {
  summary: 'Sam closed the case [1].',
  sources: [
    {
      index: 1,
      item: {
        id: 'ua-1',
        category: 'changes' as const,
        type: 'status',
        action: 'update',
        createdAt: '2026-11-23T10:00:00.000Z',
        author: 'Sam',
        detail: 'closed',
        count: 1,
      },
    },
  ],
};

const renderPanel = () => render(<WhatsNewPanel caseId="case-1" />, { wrapper: TestProviders });

describe('AI summary in the What is new panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetCaseDeltaMock.mockReturnValue({
      data: {
        since: '2026-11-17T17:42:00.000Z',
        counts,
        items: [],
        aiSummaryAvailable: true,
      },
    } as unknown as ReturnType<typeof useGetCaseDelta>);
    getCaseDeltaSummarySpy.mockResolvedValue(summaryResponse);
  });

  it('puts the summarize action in the header, before Mark as seen', () => {
    renderPanel();

    const buttons = within(screen.getByTestId('case-view-whats-new')).getAllByRole('button');
    const labels = buttons.map((button) => button.textContent);

    expect(labels.indexOf('Summarize with AI')).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf('Summarize with AI')).toBeLessThan(labels.indexOf('Mark as seen'));
  });

  it('asks for a summary only when the analyst asks', () => {
    renderPanel();

    expect(getCaseDeltaSummarySpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('case-view-ai-summary')).not.toBeInTheDocument();
  });

  it('shows the summary with its sources and the disclaimer', async () => {
    renderPanel();

    await userEvent.click(screen.getByTestId('case-view-ai-summary-button'));

    expect(await screen.findByTestId('case-view-ai-summary-text')).toHaveTextContent(
      'Sam closed the case [1].'
    );
    expect(screen.getByTestId('case-view-ai-summary-source-1')).toHaveTextContent(
      '[1] Status set to Closed by Sam'
    );
    expect(screen.getByTestId('case-view-ai-summary')).toHaveTextContent(
      'AI-generated. Check the sources.'
    );
    expect(getCaseDeltaSummarySpy).toHaveBeenCalledWith('case-1');
  });

  it('hides the header action once the analyst has a summary', async () => {
    renderPanel();

    await userEvent.click(screen.getByTestId('case-view-ai-summary-button'));
    await screen.findByTestId('case-view-ai-summary');

    expect(screen.queryByTestId('case-view-ai-summary-button')).not.toBeInTheDocument();
  });

  it('shows a loading state while the model works', async () => {
    getCaseDeltaSummarySpy.mockReturnValue(new Promise(() => {}));
    renderPanel();

    await userEvent.click(screen.getByTestId('case-view-ai-summary-button'));

    expect(await screen.findByTestId('case-view-ai-summary-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('case-view-ai-summary-button')).not.toBeInTheDocument();
  });

  it('shows an error and lets the analyst try again', async () => {
    getCaseDeltaSummarySpy.mockRejectedValueOnce(new Error('model failed'));
    renderPanel();

    await userEvent.click(screen.getByTestId('case-view-ai-summary-button'));
    expect(await screen.findByTestId('case-view-ai-summary-error')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Try again'));

    expect(await screen.findByTestId('case-view-ai-summary')).toBeInTheDocument();
    expect(getCaseDeltaSummarySpy).toHaveBeenCalledTimes(2);
  });

  it('asks the model again when the analyst regenerates the summary', async () => {
    renderPanel();
    await userEvent.click(screen.getByTestId('case-view-ai-summary-button'));
    await screen.findByTestId('case-view-ai-summary');

    await userEvent.click(screen.getByTestId('case-view-ai-summary-regenerate'));

    await waitFor(() => expect(getCaseDeltaSummarySpy).toHaveBeenCalledTimes(2));
  });

  it('says so when the model returns no text', async () => {
    getCaseDeltaSummarySpy.mockResolvedValue({ summary: '', sources: [] });
    renderPanel();

    await userEvent.click(screen.getByTestId('case-view-ai-summary-button'));

    expect(await screen.findByTestId('case-view-ai-summary-text')).toHaveTextContent(
      'The model returned no summary.'
    );
  });

  it('shows text with markup as plain text', async () => {
    getCaseDeltaSummarySpy.mockResolvedValue({
      summary: '<img src=x onerror=alert(1)> [1]',
      sources: [],
    });
    renderPanel();

    await userEvent.click(screen.getByTestId('case-view-ai-summary-button'));

    expect(await screen.findByTestId('case-view-ai-summary-text')).toHaveTextContent(
      '<img src=x onerror=alert(1)> [1]'
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

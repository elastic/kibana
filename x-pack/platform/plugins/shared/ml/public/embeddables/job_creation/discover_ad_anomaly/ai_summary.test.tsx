/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AiSummary } from './ai_summary';

const mockSummarizeAnomaly = jest.fn();
// The same api each render, as the real context gives.
const mockMlApi = { jobs: { summarizeAnomaly: mockSummarizeAnomaly } };

jest.mock('../../../application/contexts/kibana', () => ({
  useMlApi: () => mockMlApi,
}));

const renderIt = () =>
  render(
    <I18nProvider>
      <AiSummary jobId="my-job" timestamp={1000} endTimestamp={5000} />
    </I18nProvider>
  );
const toggle = () => fireEvent.click(screen.getByRole('button', { name: /AI summary/ }));

describe('AiSummary', () => {
  beforeEach(() => mockSummarizeAnomaly.mockReset());

  it('does not ask AI until it is expanded', () => {
    renderIt();
    expect(mockSummarizeAnomaly).not.toHaveBeenCalled();
  });

  it('asks AI for the job and time range when expanded, and shows the summary', async () => {
    mockSummarizeAnomaly.mockResolvedValue({ summary: 'Durations were far above typical.' });
    renderIt();
    toggle();

    expect(mockSummarizeAnomaly).toHaveBeenCalledWith(
      { jobId: 'my-job', start: 1000, end: 5000 },
      expect.any(AbortSignal)
    );
    expect(await screen.findByText('Durations were far above typical.')).toBeInTheDocument();
  });

  it('asks only once, however many times it is expanded', async () => {
    mockSummarizeAnomaly.mockResolvedValue({ summary: 'Once.' });
    renderIt();
    toggle();
    await screen.findByText('Once.');
    toggle();
    toggle();
    expect(mockSummarizeAnomaly).toHaveBeenCalledTimes(1);
  });

  it('shows the error when the summary could not be generated', async () => {
    mockSummarizeAnomaly.mockRejectedValue(new Error('No AI connector available.'));
    renderIt();
    toggle();

    expect(await screen.findByTestId('mlDiscoverADAnomalyAiSummaryError')).toHaveTextContent(
      'No AI connector available.'
    );
  });
});

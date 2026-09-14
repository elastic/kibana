/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import {
  EpisodesPageErrorsProvider,
  usePageErrors,
  useReportPageError,
  useReportSourceErrors,
} from './episodes_page_errors_context';

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status } });

const ReportError = ({ id, error }: { id: string; error: Error | undefined }) => {
  useReportPageError(id, error);
  return null;
};

const VisibleErrors = () => {
  const errors = usePageErrors();
  return (
    <div data-test-subj="visible-errors">
      {errors.map((error) => (
        <span key={error.message}>{error.message}</span>
      ))}
    </div>
  );
};

describe('EpisodesPageErrorsProvider', () => {
  it('surfaces a reported 500 and clears it on unmount', async () => {
    const { rerender } = render(
      <EpisodesPageErrorsProvider>
        <ReportError id="list:alerting-v2" error={new Error('v2 failed')} />
        <VisibleErrors />
      </EpisodesPageErrorsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('v2 failed')).toBeInTheDocument();
    });

    rerender(
      <EpisodesPageErrorsProvider>
        <VisibleErrors />
      </EpisodesPageErrorsProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('v2 failed')).not.toBeInTheDocument();
    });
  });

  it('does not surface 403 or 503 errors', async () => {
    render(
      <EpisodesPageErrorsProvider>
        <ReportError id="list:classic-alerts" error={httpError(403, 'Forbidden')} />
        <ReportError id="list:alerting-v2" error={httpError(503, 'Unavailable')} />
        <ReportError id="kpis:alerting-v2" error={new Error('v2 500')} />
        <VisibleErrors />
      </EpisodesPageErrorsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('v2 500')).toBeInTheDocument();
    });
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('dedupes visible errors by message', async () => {
    render(
      <EpisodesPageErrorsProvider>
        <ReportError id="list:classic-alerts" error={new Error('same boom')} />
        <ReportError id="kpis:classic-alerts" error={new Error('same boom')} />
        <VisibleErrors />
      </EpisodesPageErrorsProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('same boom')).toHaveLength(1);
    });
  });

  it('useReportSourceErrors reports and clears recovered sources', async () => {
    const { result, rerender } = renderHook(
      ({ sourceErrors }: { sourceErrors: Array<{ sourceId: string; error: Error }> }) => {
        useReportSourceErrors('episodes-list', sourceErrors);
        return usePageErrors();
      },
      {
        wrapper: ({ children }) => (
          <EpisodesPageErrorsProvider>{children}</EpisodesPageErrorsProvider>
        ),
        initialProps: {
          sourceErrors: [{ sourceId: 'classic-alerts', error: new Error('classic failed') }],
        },
      }
    );

    await waitFor(() => {
      expect(result.current.map((error) => error.message)).toEqual(['classic failed']);
    });

    rerender({ sourceErrors: [] });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders } from '../../../../common/mock';
import { WhatsNewPanel } from './whats_new_panel';
import { useCaseViewedMarker } from './use_case_viewed_marker';
import { useGetCaseDelta } from './use_get_case_delta';

jest.mock('./use_case_viewed_marker');
jest.mock('./use_get_case_delta');

const useCaseViewedMarkerMock = jest.mocked(useCaseViewedMarker);
const useGetCaseDeltaMock = jest.mocked(useGetCaseDelta);

const since = '2026-11-17T17:42:00.000Z';
const counts = { alerts: 6, comments: 4, changes: 2, evidence: 3 };

const mockDelta = (data: { counts: typeof counts } | undefined) =>
  useGetCaseDeltaMock.mockReturnValue({
    data: data && { since, ...data },
  } as unknown as ReturnType<typeof useGetCaseDelta>);

describe('WhatsNewPanel', () => {
  const markSeen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useCaseViewedMarkerMock.mockReturnValue({ since, isDismissed: false, markSeen });
    mockDelta({ counts });
  });

  it('shows the count of each category', () => {
    render(<WhatsNewPanel caseId="case-1" />, { wrapper: TestProviders });

    expect(screen.getByTestId('case-view-whats-new-alerts')).toHaveTextContent('6');
    expect(screen.getByTestId('case-view-whats-new-comments')).toHaveTextContent('4');
    expect(screen.getByTestId('case-view-whats-new-changes')).toHaveTextContent('2');
    expect(screen.getByTestId('case-view-whats-new-evidence')).toHaveTextContent('3');
  });

  it('shows nothing on a first visit', () => {
    useCaseViewedMarkerMock.mockReturnValue({ since: null, isDismissed: false, markSeen });

    render(<WhatsNewPanel caseId="case-1" />, { wrapper: TestProviders });

    expect(screen.queryByTestId('case-view-whats-new')).not.toBeInTheDocument();
  });

  it('shows nothing when no category has changes', () => {
    mockDelta({ counts: { alerts: 0, comments: 0, changes: 0, evidence: 0 } });

    render(<WhatsNewPanel caseId="case-1" />, { wrapper: TestProviders });

    expect(screen.queryByTestId('case-view-whats-new')).not.toBeInTheDocument();
  });

  it('marks the case as seen when the analyst dismisses the panel', async () => {
    render(<WhatsNewPanel caseId="case-1" />, { wrapper: TestProviders });

    await userEvent.click(screen.getByTestId('case-view-whats-new-dismiss'));

    expect(markSeen).toHaveBeenCalledTimes(1);
  });
});

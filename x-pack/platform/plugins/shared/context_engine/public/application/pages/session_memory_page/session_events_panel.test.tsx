/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { useSaveSessionEvent } from '../../hooks/use_session_memory_mutations';
import { useSessionEvents } from '../../hooks/use_session_events';
import { SessionEventsPanel } from './session_events_panel';
import { fillScope, renderWithProviders } from './test_helpers';

jest.mock('../../hooks/use_session_memory_mutations', () => ({ useSaveSessionEvent: jest.fn() }));
jest.mock('../../hooks/use_session_events', () => ({ useSessionEvents: jest.fn() }));

const mockUseSaveSessionEvent = jest.mocked(useSaveSessionEvent);
const mockUseSessionEvents = jest.mocked(useSessionEvents);

const mutationResult = (overrides = {}) =>
  ({ mutate: jest.fn(), isLoading: false, data: undefined, ...overrides } as unknown as ReturnType<
    typeof useSaveSessionEvent
  >);

const eventsResult = (overrides = {}) => ({
  events: [],
  count: 0,
  isLoading: false,
  error: undefined,
  refetch: jest.fn(),
  ...overrides,
});

const event = {
  id: 'e-1',
  '@timestamp': '2026-01-01T00:00:00.000Z',
  session_id: 's-1',
  user_id: 'u-1',
  agent_id: 'a-1',
  round_id: 'r-1',
  transcript: 'user: hi\nagent: hello',
};

describe('SessionEventsPanel', () => {
  beforeEach(() => {
    mockUseSaveSessionEvent.mockReturnValue(mutationResult());
    mockUseSessionEvents.mockReturnValue(eventsResult());
  });

  afterEach(() => jest.clearAllMocks());

  it('saves an event with the ids, round, and transcript', () => {
    const mutate = jest.fn();
    mockUseSaveSessionEvent.mockReturnValue(mutationResult({ mutate }));
    renderWithProviders(<SessionEventsPanel />);

    expect(screen.getByTestId('contextSessionEvents-submit')).toBeDisabled();
    fillScope('contextSessionEvents');
    fireEvent.change(screen.getByTestId('contextSessionEvents-roundId'), {
      target: { value: 'r-1' },
    });
    fireEvent.change(screen.getByTestId('contextSessionEvents-transcript'), {
      target: { value: 'user: hi' },
    });
    fireEvent.click(screen.getByTestId('contextSessionEvents-submit'));

    expect(mutate).toHaveBeenCalledWith(
      {
        session_id: 's-1',
        user_id: 'u-1',
        agent_id: 'a-1',
        round_id: 'r-1',
        transcript: 'user: hi',
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('does not list events until a session is loaded', () => {
    renderWithProviders(<SessionEventsPanel />);

    expect(mockUseSessionEvents).toHaveBeenCalledWith({
      sessionId: '',
      space: undefined,
      aiIndexId: undefined,
    });
    expect(screen.queryByTestId('contextSessionEvents-listTitle')).not.toBeInTheDocument();
  });

  it('lists the session’s events after Load events', () => {
    mockUseSessionEvents.mockReturnValue(eventsResult({ events: [event], count: 1 }));
    renderWithProviders(<SessionEventsPanel />);

    fillScope('contextSessionEvents');
    fireEvent.click(screen.getByTestId('contextSessionEvents-load'));

    expect(mockUseSessionEvents).toHaveBeenLastCalledWith({
      sessionId: 's-1',
      space: undefined,
      aiIndexId: undefined,
    });
    expect(screen.getByTestId('contextSessionEvents-listTitle')).toHaveTextContent(
      'Events for s-1 (1)'
    );
    expect(screen.getByTestId('contextSessionEventRow')).toHaveTextContent('user: hi');
    expect(screen.getByTestId('contextSessionEventRow')).toHaveTextContent('r-1');
  });

  it('shows the empty prompt for a session without events', () => {
    renderWithProviders(<SessionEventsPanel />);

    fillScope('contextSessionEvents');
    fireEvent.click(screen.getByTestId('contextSessionEvents-load'));

    expect(screen.getByTestId('contextSessionEvents-empty')).toBeInTheDocument();
  });

  it('shows the list error', () => {
    mockUseSessionEvents.mockReturnValue(eventsResult({ error: new Error('boom') }));
    renderWithProviders(<SessionEventsPanel />);

    fillScope('contextSessionEvents');
    fireEvent.click(screen.getByTestId('contextSessionEvents-load'));

    expect(screen.getByTestId('contextSessionEvents-error')).toHaveTextContent('boom');
  });
});

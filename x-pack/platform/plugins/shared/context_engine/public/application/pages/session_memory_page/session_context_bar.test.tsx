/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { SessionContextBar } from './session_context_bar';
import { useAiIndexOptions } from './use_ai_index_options';
import { buildSessionContext, renderWithProviders } from './test_helpers';

jest.mock('./use_ai_index_options', () => ({ useAiIndexOptions: jest.fn() }));

const mockUseAiIndexOptions = jest.mocked(useAiIndexOptions);

describe('SessionContextBar', () => {
  beforeEach(() => {
    mockUseAiIndexOptions.mockReturnValue({ options: [], isLoading: false });
  });

  afterEach(() => jest.clearAllMocks());

  it('shows the current user and space and the session id', () => {
    renderWithProviders(<SessionContextBar />);

    expect(screen.getByTestId('contextSessionContextUser')).toHaveTextContent('kathleen');
    expect(screen.getByTestId('contextSessionContextSpace')).toHaveTextContent('default');
    expect(screen.getByTestId('contextSessionContextSessionId')).toHaveValue('session-1');
  });

  it('starts a new session and edits the session id', () => {
    const session = buildSessionContext();
    renderWithProviders(<SessionContextBar />, { session });

    fireEvent.click(screen.getByTestId('contextSessionContextNewSession'));
    fireEvent.change(screen.getByTestId('contextSessionContextSessionId'), {
      target: { value: 'session-2' },
    });

    expect(session.newSession).toHaveBeenCalled();
    expect(session.setSessionId).toHaveBeenCalledWith('session-2');
  });
});

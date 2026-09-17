/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createExecutionTerminatedEvent } from '../../timeline/items/execution_terminated_event.factory';
import { RoundResponseActions } from './round_response_actions';
import { RoundResponse } from './round_response';

jest.mock('./chat_message_text', () => ({
  ChatMessageText: jest.fn(() => null),
}));

jest.mock('./streaming_text', () => ({
  StreamingText: jest.fn(() => null),
}));

jest.mock('./round_response_actions', () => ({
  RoundResponseActions: jest.fn(() => null),
}));

const roundResponseActionsMock = jest.mocked(RoundResponseActions);

const terminated = createExecutionTerminatedEvent();

describe('RoundResponse', () => {
  beforeEach(() => {
    roundResponseActionsMock.mockClear();
  });

  it('renders response actions after a completed response', () => {
    render(
      <RoundResponse
        hasError={false}
        response={{ message: 'hi' }}
        steps={[]}
        isLoading={false}
        executionTerminatedEvent={terminated}
      />
    );

    expect(roundResponseActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'hi',
        isVisible: true,
        executionTerminatedEvent: terminated,
        steps: [],
      }),
      expect.anything()
    );
  });

  it('does not render response actions while loading', () => {
    render(
      <RoundResponse
        hasError={false}
        response={{ message: 'hi' }}
        steps={[]}
        isLoading={true}
        executionTerminatedEvent={terminated}
      />
    );

    expect(roundResponseActionsMock).not.toHaveBeenCalled();
  });
});

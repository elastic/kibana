/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { createExecutionTerminatedEvent } from '../items/execution_terminated_event.factory';
import { ResponseActions } from './response_actions';
import { ResponseMessage } from './response_message';

jest.mock('./chat_message_text', () => ({
  ChatMessageText: jest.fn(() => null),
}));

jest.mock('./streaming_text', () => ({
  StreamingText: jest.fn(() => null),
}));

jest.mock('./response_actions', () => ({
  ResponseActions: jest.fn(() => null),
}));

const responseActionsMock = jest.mocked(ResponseActions);

const terminated = createExecutionTerminatedEvent();

describe('ResponseMessage', () => {
  beforeEach(() => {
    responseActionsMock.mockClear();
  });

  it('renders response actions after a completed response', () => {
    render(
      <ResponseMessage
        response={{ message: 'hi' }}
        steps={[]}
        isLoading={false}
        executionTerminatedEvent={terminated}
      />
    );

    expect(responseActionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'hi',
        isVisible: true,
        executionTerminatedEvent: terminated,
        steps: [],
      }),
      expect.anything()
    );
  });

  it('does not render response actions when there is no message (e.g. an answered pause)', () => {
    render(
      <ResponseMessage
        response={{ message: '' }}
        steps={[]}
        isLoading={false}
        executionTerminatedEvent={terminated}
      />
    );

    expect(responseActionsMock).not.toHaveBeenCalled();
  });

  it('does not render response actions while loading', () => {
    render(
      <ResponseMessage
        response={{ message: 'hi' }}
        steps={[]}
        isLoading={true}
        executionTerminatedEvent={terminated}
      />
    );

    expect(responseActionsMock).not.toHaveBeenCalled();
  });
});

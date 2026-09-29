/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { createExecutionTerminatedEvent } from '../items/execution_terminated_event.factory';
import { ResponseActions } from './response_actions';
import { ResponseMessage } from './response_message';

vi.mock('./chat_message_text', () => {
  const mocked = {
    ChatMessageText: vi.fn(() => null),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./streaming_text', () => {
  const mocked = {
    StreamingText: vi.fn(() => null),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./response_actions', () => {
  const mocked = {
    ResponseActions: vi.fn(() => null),
  };
  return { ...mocked, default: mocked };
});

const responseActionsMock = vi.mocked(ResponseActions);

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { UserMessage } from '../user_message/user_message';
import { createUserMessageEvent } from './user_message_event.factory';
import { UserMessageEvent } from './user_message_event';

jest.mock('../user_message/user_message', () => ({
  UserMessage: jest.fn(() => null),
}));

const mockUserMessage = jest.mocked(UserMessage);

describe('UserMessageEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering cost', () => {
    it('does not render again when its parent renders with the same props', () => {
      const event = createUserMessageEvent();
      const { rerender } = render(<UserMessageEvent event={event} />);
      expect(mockUserMessage).toHaveBeenCalledTimes(1);

      rerender(<UserMessageEvent event={event} />);

      expect(mockUserMessage).toHaveBeenCalledTimes(1);
    });

    it('renders again when its event changes', () => {
      const event = createUserMessageEvent();
      const { rerender } = render(<UserMessageEvent event={event} />);

      rerender(<UserMessageEvent event={{ ...event }} />);

      expect(mockUserMessage).toHaveBeenCalledTimes(2);
    });
  });
});

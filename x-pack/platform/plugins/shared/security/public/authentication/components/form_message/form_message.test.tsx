/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { type FormMessage, formMessages, MessageType, renderMessage } from './form_message';

describe('form_message', () => {
  describe('renderMessage', () => {
    it('should return null for MessageType.None', () => {
      const message: FormMessage = {
        type: MessageType.None,
        content: 'Some content',
      };
      const result = renderMessage(message);
      expect(result).toBeNull();
    });

    it('should return null when content is undefined', () => {
      const message: FormMessage = {
        type: MessageType.Info,
      };
      const result = renderMessage(message);
      expect(result).toBeNull();
    });

    it('should return null when content is empty string', () => {
      const message: FormMessage = {
        type: MessageType.Info,
        content: '',
      };
      const result = renderMessage(message);
      expect(result).toBeNull();
    });

    it('should render Info message with primary color and correct attributes', () => {
      const message: FormMessage = {
        type: MessageType.Info,
        content: 'Test info message',
      };
      render(<>{renderMessage(message)}</>);

      const callOut = screen.getByTestId('loginInfoMessage');
      expect(callOut).toBeInTheDocument();
      expect(callOut).toHaveTextContent('Test info message');
      expect(callOut).toHaveAttribute('role', 'status');
    });

    it('should render Danger message with danger color and correct attributes', () => {
      const message: FormMessage = {
        type: MessageType.Danger,
        content: 'Test error message',
      };
      render(<>{renderMessage(message)}</>);

      const callOut = screen.getByTestId('loginErrorMessage');
      expect(callOut).toBeInTheDocument();
      expect(callOut).toHaveTextContent('Test error message');
      expect(callOut).toHaveAttribute('role', 'alert');
    });

    it('should include EuiSpacer for Info messages', () => {
      const message: FormMessage = {
        type: MessageType.Info,
        content: 'Test message',
      };
      const { container } = render(<>{renderMessage(message)}</>);

      // EuiSpacer should be rendered after the callout
      expect(container.querySelector('.euiSpacer')).toBeInTheDocument();
    });

    it('should include EuiSpacer for Danger messages', () => {
      const message: FormMessage = {
        type: MessageType.Danger,
        content: 'Test message',
      };
      const { container } = render(<>{renderMessage(message)}</>);

      // EuiSpacer should be rendered after the callout
      expect(container.querySelector('.euiSpacer')).toBeInTheDocument();
    });

    it('should render Info message with announceOnMount enabled', () => {
      const message: FormMessage = {
        type: MessageType.Info,
        content: 'Test message',
      };
      render(<>{renderMessage(message)}</>);

      const callOut = screen.getByTestId('loginInfoMessage');
      // The announceOnMount prop is passed to the component
      expect(callOut).toBeInTheDocument();
    });

    it('should render Danger message with announceOnMount enabled', () => {
      const message: FormMessage = {
        type: MessageType.Danger,
        content: 'Test message',
      };
      render(<>{renderMessage(message)}</>);

      const callOut = screen.getByTestId('loginErrorMessage');
      // The announceOnMount prop is passed to the component
      expect(callOut).toBeInTheDocument();
    });
  });

  describe('formMessages', () => {
    it('should have SESSION_EXPIRED message with Info type', () => {
      expect(formMessages.SESSION_EXPIRED).toEqual({
        type: MessageType.Info,
        content: expect.any(String),
      });
      expect(formMessages.SESSION_EXPIRED.content).toBeTruthy();
      expect(formMessages.SESSION_EXPIRED.content).toContain('session');
    });

    it('should have CONCURRENCY_LIMIT message with Info type', () => {
      expect(formMessages.CONCURRENCY_LIMIT).toEqual({
        type: MessageType.Info,
        content: expect.any(String),
      });
      expect(formMessages.CONCURRENCY_LIMIT.content).toBeTruthy();
      expect(formMessages.CONCURRENCY_LIMIT.content).toContain('logged in');
    });

    it('should have AUTHENTICATION_ERROR message with Info type', () => {
      expect(formMessages.AUTHENTICATION_ERROR).toEqual({
        type: MessageType.Info,
        content: expect.any(String),
      });
      expect(formMessages.AUTHENTICATION_ERROR.content).toBeTruthy();
      expect(formMessages.AUTHENTICATION_ERROR.content).toContain('authentication');
    });

    it('should have LOGGED_OUT message with Info type', () => {
      expect(formMessages.LOGGED_OUT).toEqual({
        type: MessageType.Info,
        content: expect.any(String),
      });
      expect(formMessages.LOGGED_OUT.content).toBeTruthy();
      expect(formMessages.LOGGED_OUT.content).toContain('logged out');
    });

    it('should have UNAUTHENTICATED message with Danger type', () => {
      expect(formMessages.UNAUTHENTICATED).toEqual({
        type: MessageType.Danger,
        content: expect.any(String),
      });
      expect(formMessages.UNAUTHENTICATED.content).toBeTruthy();
      expect(formMessages.UNAUTHENTICATED.content).toContain('logging in');
    });

    it('should have all LogoutReason types covered', () => {
      const expectedReasons = [
        'SESSION_EXPIRED',
        'CONCURRENCY_LIMIT',
        'AUTHENTICATION_ERROR',
        'LOGGED_OUT',
        'UNAUTHENTICATED',
      ];

      const actualReasons = Object.keys(formMessages);
      expect(actualReasons.sort()).toEqual(expectedReasons.sort());
    });

    it('should only have UNAUTHENTICATED as Danger type', () => {
      const dangerMessages = Object.entries(formMessages).filter(
        ([_key, value]) => value.type === MessageType.Danger
      );
      expect(dangerMessages).toHaveLength(1);
      expect(dangerMessages[0][0]).toBe('UNAUTHENTICATED');
    });

    it('should have all other messages as Info type', () => {
      const infoMessages = Object.entries(formMessages).filter(
        ([_key, value]) => value.type === MessageType.Info
      );
      expect(infoMessages).toHaveLength(4);
    });
  });
});

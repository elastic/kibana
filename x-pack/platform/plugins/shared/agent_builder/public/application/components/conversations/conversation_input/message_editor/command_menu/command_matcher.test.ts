/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchCommand } from './command_matcher';

describe('matchCommand', () => {
  describe('single-character commands', () => {
    it('matches "@" at start of input', () => {
      const result = matchCommand('@');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe('attachment');
      expect(result.activeCommand?.query).toBe('');
      expect(result.activeCommand?.commandStartOffset).toBe(0);
    });

    it('matches "@" after whitespace', () => {
      const result = matchCommand('hello @');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe('attachment');
      expect(result.activeCommand?.query).toBe('');
    });

    it('does not match "@" mid-word', () => {
      const result = matchCommand('email@example');
      expect(result.isActive).toBe(false);
    });

    it('captures query text after command', () => {
      const result = matchCommand('@joh');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('joh');
    });

    it('includes trailing space in query', () => {
      const result = matchCommand('@john ');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('john ');
    });

    it('includes spaces within query', () => {
      const result = matchCommand('@john doe');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('john doe');
    });
  });

  describe('multiple command instances in text', () => {
    it('matches the last occurrence', () => {
      const result = matchCommand('hello @alice hey @bob');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('bob');
    });

    it('matches last command when earlier one was deactivated by space', () => {
      const result = matchCommand('@alice hello @bob');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('bob');
    });
  });

  describe('edge cases', () => {
    it('returns inactive for empty input', () => {
      const result = matchCommand('');
      expect(result.isActive).toBe(false);
    });

    it('returns inactive for input with no commands', () => {
      const result = matchCommand('hello world');
      expect(result.isActive).toBe(false);
    });

    it('matches command after newline', () => {
      const result = matchCommand('hello\n@bob');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('bob');
    });

    it('matches command after tab', () => {
      const result = matchCommand('hello\t@bob');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('bob');
    });
  });
});

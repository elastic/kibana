/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchCommand } from './command_matcher';
import { sortedCommandDefinitions } from './command_definitions';
import { CommandId } from './types';

const allCommands = sortedCommandDefinitions;

describe('matchCommand', () => {
  describe('multiple command sequences', () => {
    it('matches the command sequence closest to the cursor', () => {
      const result = matchCommand('@foo /bar', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe(CommandId.Skill);
      expect(result.activeCommand?.query).toBe('bar');
    });

    it('matches earlier sequence when it is closest to cursor', () => {
      const result = matchCommand('/foo @bar', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe(CommandId.Sml);
      expect(result.activeCommand?.query).toBe('bar');
    });
  });

  describe('single-character commands', () => {
    it('matches "/" at start of input', () => {
      const result = matchCommand('/', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe('skill');
      expect(result.activeCommand?.query).toBe('');
      expect(result.activeCommand?.commandStartOffset).toBe(0);
    });

    it('matches "/" after whitespace', () => {
      const result = matchCommand('hello /', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe('skill');
      expect(result.activeCommand?.query).toBe('');
    });

    it('does not match "/" mid-word', () => {
      const result = matchCommand('path/to', allCommands);
      expect(result.isActive).toBe(false);
    });

    it('captures query text after command', () => {
      const result = matchCommand('/sum', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('sum');
    });

    it('includes trailing space in query', () => {
      const result = matchCommand('/summarize ', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('summarize ');
    });

    it('includes spaces within query', () => {
      const result = matchCommand('/summarize text', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('summarize text');
    });

    it('matches "@" at start of input', () => {
      const result = matchCommand('@', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe(CommandId.Sml);
      expect(result.activeCommand?.query).toBe('');
      expect(result.activeCommand?.commandStartOffset).toBe(0);
    });

    it('matches "@" after whitespace', () => {
      const result = matchCommand('hello @', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe(CommandId.Sml);
      expect(result.activeCommand?.query).toBe('');
    });

    it('does not match "@" mid-word', () => {
      const result = matchCommand('user@host', allCommands);
      expect(result.isActive).toBe(false);
    });

    it('captures query text after @ command', () => {
      const result = matchCommand('@pac', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('pac');
    });
  });

  describe('multiple command instances in text', () => {
    it('matches the last occurrence', () => {
      const result = matchCommand('hello /summarize hey /translate', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('translate');
    });

    it('matches last command when earlier one was deactivated by space', () => {
      const result = matchCommand('/summarize hello /translate', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('translate');
    });
  });

  describe('edge cases', () => {
    it('returns inactive for empty input', () => {
      const result = matchCommand('', allCommands);
      expect(result.isActive).toBe(false);
    });

    it('returns inactive for input with no commands', () => {
      const result = matchCommand('hello world', allCommands);
      expect(result.isActive).toBe(false);
    });

    it('matches command after newline', () => {
      const result = matchCommand('hello\n/sum', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('sum');
    });

    it('matches command after tab', () => {
      const result = matchCommand('hello\t/sum', allCommands);
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('sum');
    });
  });
});

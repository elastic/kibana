/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchCommand, getTextBeforeCursor } from './command_matcher';

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

  describe('multi-character commands', () => {
    it('matches "/p" at start of input', () => {
      const result = matchCommand('/p');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe('prompt');
      expect(result.activeCommand?.query).toBe('');
    });

    it('matches "/p" after whitespace', () => {
      const result = matchCommand('hello /p');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.command.id).toBe('prompt');
    });

    it('does not match "/p" mid-word', () => {
      const result = matchCommand('foo/p');
      expect(result.isActive).toBe(false);
    });

    it('captures query after multi-char command', () => {
      const result = matchCommand('/pprompt');
      expect(result.isActive).toBe(true);
      expect(result.activeCommand?.query).toBe('prompt');
    });

    it('matches the correct command id', () => {
      const result = matchCommand('/p');
      expect(result.activeCommand?.command.id).toBe('prompt');
    });
  });

  describe('command priority', () => {
    it('longer command "/p" takes precedence over shorter "@"', () => {
      // "/p" is longer than "@", so it should match first when both could match
      const result = matchCommand('/p');
      expect(result.activeCommand?.command.id).toBe('prompt');
    });

    it('shorter command matches when longer does not apply', () => {
      // "@" matches because "/p" is not present
      const result = matchCommand('@hello');
      expect(result.activeCommand?.command.id).toBe('attachment');
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

describe('getTextBeforeCursor', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.contentEditable = 'plaintext-only';
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('returns empty string when no selection', () => {
    element.textContent = 'hello';
    window.getSelection()?.removeAllRanges();
    expect(getTextBeforeCursor(element)).toBe('');
  });

  it('returns empty string when selection is outside element', () => {
    element.textContent = 'hello';
    const otherElement = document.createElement('div');
    otherElement.textContent = 'other';
    document.body.appendChild(otherElement);

    const range = document.createRange();
    range.setStart(otherElement.firstChild!, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('');
    document.body.removeChild(otherElement);
  });

  it('returns text before cursor in simple text node', () => {
    element.textContent = 'hello world';
    const textNode = element.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 5);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('hello');
  });

  it('returns full text when cursor is at end', () => {
    element.textContent = 'hello';
    const textNode = element.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 5);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('hello');
  });

  it('returns empty string when cursor is at start', () => {
    element.textContent = 'hello';
    const textNode = element.firstChild!;

    const range = document.createRange();
    range.setStart(textNode, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('');
  });

  it('returns empty string for element with no text content', () => {
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);

    expect(getTextBeforeCursor(element)).toBe('');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMatchTrigger, getTextBeforeCursor } from './trigger_matcher';
import { TriggerId } from './types';

const matchTrigger = createMatchTrigger([
  { id: TriggerId.Attachment, sequence: '@' },
  { id: TriggerId.Prompt, sequence: '/p' },
]);

describe('matchTrigger', () => {
  describe('single-character triggers', () => {
    it('matches "@" at start of input', () => {
      const result = matchTrigger('@');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.trigger.id).toBe('attachment');
      expect(result.activeTrigger?.query).toBe('');
      expect(result.activeTrigger?.triggerStartOffset).toBe(0);
    });

    it('matches "@" after whitespace', () => {
      const result = matchTrigger('hello @');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.trigger.id).toBe('attachment');
      expect(result.activeTrigger?.query).toBe('');
    });

    it('does not match "@" mid-word', () => {
      const result = matchTrigger('email@example');
      expect(result.isActive).toBe(false);
    });

    it('captures query text after trigger', () => {
      const result = matchTrigger('@joh');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('joh');
    });

    it('includes trailing space in query', () => {
      const result = matchTrigger('@john ');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('john ');
    });

    it('includes spaces within query', () => {
      const result = matchTrigger('@john doe');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('john doe');
    });
  });

  describe('multi-character triggers', () => {
    it('matches "/p" at start of input', () => {
      const result = matchTrigger('/p');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.trigger.id).toBe('prompt');
      expect(result.activeTrigger?.query).toBe('');
    });

    it('matches "/p" after whitespace', () => {
      const result = matchTrigger('hello /p');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.trigger.id).toBe('prompt');
    });

    it('does not match "/p" mid-word', () => {
      const result = matchTrigger('foo/p');
      expect(result.isActive).toBe(false);
    });

    it('captures query after multi-char trigger', () => {
      const result = matchTrigger('/pprompt');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('prompt');
    });

    it('matches the correct trigger id', () => {
      const result = matchTrigger('/p');
      expect(result.activeTrigger?.trigger.id).toBe('prompt');
    });
  });

  describe('trigger priority', () => {
    it('longer trigger "/p" takes precedence over shorter "@"', () => {
      // "/p" is longer than "@", so it should match first when both could match
      const result = matchTrigger('/p');
      expect(result.activeTrigger?.trigger.id).toBe('prompt');
    });

    it('shorter trigger matches when longer does not apply', () => {
      // "@" matches because "/p" is not present
      const result = matchTrigger('@hello');
      expect(result.activeTrigger?.trigger.id).toBe('attachment');
    });
  });

  describe('multiple trigger instances in text', () => {
    it('matches the last occurrence', () => {
      const result = matchTrigger('hello @alice hey @bob');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('bob');
    });

    it('matches last trigger when earlier one was deactivated by space', () => {
      const result = matchTrigger('@alice hello @bob');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('bob');
    });
  });

  describe('edge cases', () => {
    it('returns inactive for empty input', () => {
      const result = matchTrigger('');
      expect(result.isActive).toBe(false);
    });

    it('returns inactive for input with no triggers', () => {
      const result = matchTrigger('hello world');
      expect(result.isActive).toBe(false);
    });

    it('matches trigger after newline', () => {
      const result = matchTrigger('hello\n@bob');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('bob');
    });

    it('matches trigger after tab', () => {
      const result = matchTrigger('hello\t@bob');
      expect(result.isActive).toBe(true);
      expect(result.activeTrigger?.query).toBe('bob');
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

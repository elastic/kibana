/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { changeBetween, createCodeEditorModuleMock } from './mock_code_editor';
import { caretAfterChange } from '../ui/use_reference_editor';

describe('changeBetween', () => {
  // [what happens, before, after, caret after the edit, the change a Monaco editor would report]
  it.each([
    ['a typed character', 'ab', 'axb', 2, { rangeOffset: 1, rangeLength: 0, text: 'x' }],
    ['a character typed at the end', 'ab', 'abc', 3, { rangeOffset: 2, rangeLength: 0, text: 'c' }],
    ['a repeated character', 'aa', 'aaa', 3, { rangeOffset: 2, rangeLength: 0, text: 'a' }],
    ['a delete', 'abcd', 'abd', 2, { rangeOffset: 2, rangeLength: 1, text: '' }],
    ['a paste', 'ad', 'abcd', 3, { rangeOffset: 1, rangeLength: 0, text: 'bc' }],
    ['a paste over a selection', 'abcd', 'aXYd', 3, { rangeOffset: 1, rangeLength: 2, text: 'XY' }],
    ['clearing the text', 'abc', '', 0, { rangeOffset: 0, rangeLength: 3, text: '' }],
    ['no change', 'abc', 'abc', 3, { rangeOffset: 3, rangeLength: 0, text: '' }],
    [
      'a whole replacement, caret at the end',
      'old text',
      'new text',
      8,
      { rangeOffset: 0, rangeLength: 8, text: 'new text' },
    ],
  ])('reads %s as Monaco does', (_what, before, after, caret, expected) => {
    expect(changeBetween(before, after, caret)).toEqual(expected);
  });

  it('defaults the caret to the end of the new text', () => {
    expect(changeBetween('ab', 'abc')).toEqual({ rangeOffset: 2, rangeLength: 0, text: 'c' });
  });

  it('leaves the caret where the edit ended, which is what the panel reads it for', () => {
    const caretAfter = (before: string, after: string, caret: number) =>
      caretAfterChange(after, { changes: [changeBetween(before, after, caret)] });

    expect(caretAfter('abcd', 'abd', 2)).toBe(2);
    expect(caretAfter('ad', 'abcd', 3)).toBe(3);
    expect(caretAfter('abcd', 'aXYd', 3)).toBe(3);
  });
});

describe('the mocked code editor', () => {
  const { CodeEditor } = createCodeEditorModuleMock();

  it('reports a delete as a delete, not as a typed character', () => {
    const onChange = jest.fn();
    render(<CodeEditor value="abcd" languageId="plaintext" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('mocked-code-editor'), {
      target: { value: 'abd', selectionStart: 2, selectionEnd: 2 },
    });

    expect(onChange).toHaveBeenCalledWith('abd', {
      changes: [{ rangeOffset: 2, rangeLength: 1, text: '' }],
    });
  });
});

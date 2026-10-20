/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { PatternTesterPanel } from './pattern_tester_panel';

const mockTest = jest.fn();
let mockResult: { maskedInput: unknown; anonymizations: []; stats: object } | undefined;

jest.mock('../hooks/use_pattern_tester', () => ({
  usePatternTester: () => ({ test: mockTest, result: mockResult, isLoading: false }),
}));

// The Monaco-based editor isn't usable in jsdom; a textarea keeps value/onChange/language visible.
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    languageId,
    'data-test-subj': testSubj,
  }: {
    value: string;
    onChange: (value: string) => void;
    languageId: string;
    'data-test-subj'?: string;
  }) => (
    <textarea
      data-test-subj={testSubj}
      data-language={languageId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

const rules: RegexAnonymizationRule[] = [
  { type: 'RegExp', enabled: true, entityClass: 'EMAIL', pattern: '\\S+@\\S+' },
];

const renderPanel = (defaultInput: string) =>
  render(
    <I18nProvider>
      <PatternTesterPanel rules={rules} defaultInput={defaultInput} />
    </I18nProvider>
  );

const clickTest = () => fireEvent.click(screen.getByRole('button', { name: /test pattern/i }));

describe('PatternTesterPanel input handling', () => {
  beforeEach(() => {
    mockTest.mockReset();
    mockResult = undefined;
  });

  it('sends a JSON object structurally so each field is matched on its own path', () => {
    renderPanel('{"contact":"a@b.com"}');
    clickTest();

    expect(mockTest).toHaveBeenCalledWith({ contact: 'a@b.com' }, rules);
  });

  it('sends non-JSON input as plain text instead of rejecting it', () => {
    renderPanel('please mail a@b.com about the incident');
    clickTest();

    expect(mockTest).toHaveBeenCalledWith('please mail a@b.com about the incident', rules);
    expect(screen.queryByText(/valid JSON/i)).not.toBeInTheDocument();
  });

  it('treats a bare JSON scalar as plain text, since only objects and arrays are structured', () => {
    renderPanel('12345');
    clickTest();

    expect(mockTest).toHaveBeenCalledWith('12345', rules);
  });

  it('shows a plain-text result without JSON quoting or escaping', () => {
    mockResult = { maskedInput: 'mail EMAIL_abc\nthanks', anonymizations: [], stats: {} };
    const { container } = renderPanel('mail a@b.com\nthanks');

    expect(Array.from(container.querySelectorAll('textarea')).map((el) => el.value)).toContain(
      'mail EMAIL_abc\nthanks'
    );
  });
});

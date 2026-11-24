/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MAX_REASON_TEMPLATE_LENGTH } from '@kbn/alerting-v2-schemas';
import { monaco } from '@kbn/code-editor';
import { ReasonField, validateReasonTemplate } from './reason_field';
import { createFormWrapper } from '../../test_utils';

const mockEditor = { getModel: jest.fn(), onDidDispose: jest.fn() };

jest.mock('@kbn/code-editor', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useEffect } = jest.requireActual('react');
  return {
    ...jest.requireActual('@kbn/code-editor'),
    CodeEditor: ({
      value,
      onChange,
      dataTestSubj,
      placeholder,
      editorDidMount,
    }: {
      value: string;
      onChange: (next: string) => void;
      dataTestSubj: string;
      placeholder?: string;
      editorDidMount: (editor: unknown) => void;
    }) => {
      useEffect(() => editorDidMount(mockEditor), [editorDidMount]);
      return (
        <textarea
          data-test-subj={dataTestSubj}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    },
  };
});

describe('ReasonField', () => {
  let registerProvider: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    registerProvider = jest
      .spyOn(monaco.languages, 'registerCompletionItemProvider')
      .mockReturnValue({ dispose: jest.fn() });
  });

  afterEach(() => {
    registerProvider.mockRestore();
  });

  it('renders an optional reason editor', () => {
    render(<ReasonField />, { wrapper: createFormWrapper() });

    expect(screen.getByTestId('ruleReasonInput')).toHaveValue('');
    expect(screen.getByText('Reason')).toBeInTheDocument();
    expect(screen.getByText('optional')).toBeInTheDocument();
  });

  it('shows an example of the syntax as placeholder', () => {
    render(<ReasonField />, { wrapper: createFormWrapper() });

    expect(
      screen.getByPlaceholderText('Example: CPU on {{ data.host.name }} was {{ data.cpu_pct }}%')
    ).toBeInTheDocument();
  });

  it('shows the template of the rule', () => {
    render(<ReasonField />, {
      wrapper: createFormWrapper({ reason: { template: 'CPU on {{ data.host.name }}' } }),
    });

    expect(screen.getByTestId('ruleReasonInput')).toHaveValue('CPU on {{ data.host.name }}');
  });

  it('updates the value when the user types a template', async () => {
    const user = userEvent.setup();
    render(<ReasonField />, { wrapper: createFormWrapper() });

    await user.click(screen.getByTestId('ruleReasonInput'));
    await user.paste('Delay {{ data.delay }}');

    expect(screen.getByTestId('ruleReasonInput')).toHaveValue('Delay {{ data.delay }}');
  });

  it('registers the completion provider for the liquid language on mount', () => {
    render(<ReasonField />, { wrapper: createFormWrapper() });

    expect(registerProvider).toHaveBeenCalledTimes(1);
    expect(registerProvider).toHaveBeenCalledWith(
      'liquid',
      expect.objectContaining({ provideCompletionItems: expect.any(Function) })
    );
  });

  it('offers the rule variables as suggestions inside an open expression', () => {
    const model = { getLineContent: () => '{{ ' };
    mockEditor.getModel.mockReturnValue(model);
    render(<ReasonField />, { wrapper: createFormWrapper() });

    const [, provider] = registerProvider.mock.calls[0];
    const { suggestions } = provider.provideCompletionItems(model, { lineNumber: 1, column: 4 });

    expect(suggestions.map(({ label }: { label: string }) => label)).toEqual(
      expect.arrayContaining([
        'rule.id',
        'rule.name',
        'rule.description',
        'rule.tags',
        'rule.version',
      ])
    );
  });

  it('removes the completion provider when the editor is disposed', () => {
    render(<ReasonField />, { wrapper: createFormWrapper() });

    const { dispose } = registerProvider.mock.results[0].value;
    const [onDispose] = mockEditor.onDidDispose.mock.calls[0];
    onDispose();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('validateReasonTemplate', () => {
  it('accepts an unset or empty reason', () => {
    expect(validateReasonTemplate(undefined)).toBe(true);
    expect(validateReasonTemplate('')).toBe(true);
  });

  it('rejects a blank reason', () => {
    expect(validateReasonTemplate('   ')).toBe('Reason cannot be blank.');
  });

  it('accepts a reason of the maximum length and rejects a longer one', () => {
    expect(validateReasonTemplate('a'.repeat(MAX_REASON_TEMPLATE_LENGTH))).toBe(true);
    expect(validateReasonTemplate('a'.repeat(MAX_REASON_TEMPLATE_LENGTH + 1))).toBe(
      `Reason cannot exceed ${MAX_REASON_TEMPLATE_LENGTH} characters.`
    );
  });
});

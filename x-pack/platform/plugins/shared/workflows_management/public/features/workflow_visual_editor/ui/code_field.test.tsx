/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { CodeField } from './code_field';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import type { StepFormField } from '../lib/step_form_schema';

jest.mock('@kbn/workflows-ui', () =>
  jest.requireActual('../test_utils/mock_workflows_ui').createWorkflowsUiModuleMock()
);

jest.mock('@kbn/code-editor', () =>
  jest.requireActual('../test_utils/mock_code_editor').createCodeEditorModuleMock()
);

// The real picker pulls in the step icons; its insert callback is all these tests need.
jest.mock('./data_reference_picker', () => ({
  DataReferencePicker: ({
    isOpen,
    onInsert,
    input,
  }: {
    isOpen: boolean;
    onInsert: (token: string) => void;
    input: React.ReactElement;
  }) => (
    <div>
      {input}
      {isOpen ? (
        <button type="button" data-test-subj="mockInsert" onClick={() => onInsert('{{ event.a }}')}>
          {'insert'}
        </button>
      ) : null}
    </div>
  ),
}));

const catalog: DataReferenceCatalog = { groups: [] };
const TEST_ID = 'code';

const fieldOf = (language: StepFormField['language']): StepFormField => ({
  key: 'body',
  path: ['with', 'body'],
  label: 'Body',
  required: false,
  kind: 'code',
  language,
});

const setup = ({
  language,
  value,
  withExpand = true,
  fixedOnly = false,
}: {
  language: StepFormField['language'];
  value: unknown;
  withExpand?: boolean;
  fixedOnly?: boolean;
}) => {
  const onChange = jest.fn();
  const onExpand = jest.fn();
  const view = (current: unknown) => (
    <I18nProvider>
      <CodeField
        field={fieldOf(language)}
        value={current}
        catalog={catalog}
        onChange={onChange}
        testSubj={TEST_ID}
        isInvalid={false}
        onBlur={jest.fn()}
        onDraftErrorChange={jest.fn()}
        onExpand={withExpand ? onExpand : undefined}
        fixedOnly={fixedOnly}
      />
    </I18nProvider>
  );
  const { rerender } = render(view(value));
  return { onChange, onExpand, rerender: (next: unknown) => rerender(view(next)) };
};

describe('CodeField', () => {
  describe('a value that collapsing would change', () => {
    const multiline = 'first line\nsecond line';

    it('shows the collapsed text and opens the expanded editor on click, not an inline editor', () => {
      const { onChange, onExpand } = setup({ language: 'plaintext', value: multiline });

      const field = screen.getByTestId(TEST_ID);
      expect(field).toHaveTextContent('first line second line');
      fireEvent.click(field);

      expect(onExpand).toHaveBeenCalledTimes(1);
      expect(field).toHaveAttribute('data-mode', 'read');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('opens the expanded editor from the keyboard too', () => {
      const { onExpand } = setup({ language: 'plaintext', value: multiline });
      fireEvent.keyDown(screen.getByTestId(TEST_ID), { key: 'Enter' });
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('does not open on focus, which would reopen it each time the expanded editor closes', () => {
      const { onExpand } = setup({ language: 'plaintext', value: multiline });
      fireEvent.focusIn(screen.getByTestId(TEST_ID));
      expect(onExpand).not.toHaveBeenCalled();
    });

    it('keeps JSON strings with runs of spaces out of the inline editor', () => {
      const { onExpand } = setup({ language: 'json', value: { text: 'a  b' } });
      fireEvent.click(screen.getByTestId(TEST_ID));
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('appends a picked reference to the original text, not to its collapsed copy', () => {
      const { onChange } = setup({ language: 'plaintext', value: multiline });

      fireEvent.click(screen.getByTestId('workflowStepConfigDataReference'));
      fireEvent.click(screen.getByTestId('mockInsert'));

      expect(onChange).toHaveBeenCalledTimes(1);
      const [written] = onChange.mock.calls[0];
      expect(written.startsWith('first line\nsecond line')).toBe(true);
      expect(written).toContain('event.a');
    });

    it('is read-only, and opens the expanded editor, in a fixed-only field', () => {
      const { onChange, onExpand } = setup({
        language: 'plaintext',
        value: multiline,
        fixedOnly: true,
      });
      const input = screen.getByTestId(TEST_ID);
      expect(input).toHaveAttribute('readonly');
      fireEvent.click(input);
      expect(onExpand).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('stays editable inline when there is no expanded editor to send the edit to', () => {
      setup({ language: 'plaintext', value: multiline, withExpand: false });
      expect(screen.getByTestId(TEST_ID)).toHaveAttribute('data-mode', 'read');
      fireEvent.focusIn(screen.getByTestId(TEST_ID));
      expect(screen.getByTestId(TEST_ID)).toBeInTheDocument();
      expect(document.querySelector('[data-mode="edit"]')).toBeInTheDocument();
    });
  });

  describe('a value that collapsing leaves as it is', () => {
    it('edits inline', () => {
      const { onExpand } = setup({ language: 'plaintext', value: 'one line' });
      fireEvent.focusIn(screen.getByTestId(TEST_ID));
      expect(document.querySelector('[data-mode="edit"]')).toBeInTheDocument();
      expect(onExpand).not.toHaveBeenCalled();
    });

    it('edits a JSON object inline: whitespace between tokens is not part of its value', () => {
      const { onExpand } = setup({ language: 'json', value: { a: 1, b: [1, 2] } });
      fireEvent.focusIn(screen.getByTestId(TEST_ID));
      expect(document.querySelector('[data-mode="edit"]')).toBeInTheDocument();
      expect(onExpand).not.toHaveBeenCalled();
    });
  });

  describe('the draft of an inline JSON field', () => {
    const typeInEditor = (text: string) => {
      const editor = document.querySelector('[data-mode="edit"] textarea') as HTMLTextAreaElement;
      fireEvent.change(editor, { target: { value: text, selectionStart: text.length } });
    };

    it('keeps what was typed when the parent echoes the valid value back re-formatted', () => {
      const { onChange, rerender } = setup({ language: 'json', value: { a: 1 } });
      fireEvent.focusIn(screen.getByTestId(TEST_ID));

      typeInEditor('{"a":2}');
      expect(onChange).toHaveBeenLastCalledWith({ a: 2 });

      // The fragment round-trip hands the parsed value back, which is shown as `{ "a": 2 }`.
      act(() => rerender({ a: 2 }));

      const editor = document.querySelector('[data-mode="edit"] textarea') as HTMLTextAreaElement;
      expect(editor.value).toBe('{"a":2}');
    });

    it('shows a value that changed from outside', () => {
      const { rerender } = setup({ language: 'json', value: { a: 1 } });
      act(() => rerender({ b: 3 }));
      expect(screen.getByTestId(TEST_ID)).toHaveTextContent('{ "b": 3 }');
    });
  });
});

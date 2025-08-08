/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { waitFor, fireEvent, screen, act } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as i18n from '../../common/translations';

const { emptyField, maxLengthField } = fieldValidators;

import { EditableMarkdown } from '.';
import { renderWithTestingProviders } from '../../common/mock';

jest.mock('../../common/lib/kibana');

const onChangeEditable = jest.fn();
const onSaveContent = jest.fn();

const newValue = 'Hello from Tehas';
const hyperlink = `[hyperlink](http://elastic.co)`;
const draftStorageKey = `cases.securitySolution.caseId.markdown-id.markdownEditor`;
const content = `A link to a timeline ${hyperlink}`;
const maxLength = 5000;

const mockSchema: FormSchema<{ content: string }> = {
  content: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_FIELD),
      },
      {
        validator: maxLengthField({
          length: maxLength,
          message: i18n.MAX_LENGTH_ERROR('textarea', maxLength),
        }),
      },
    ],
  },
};

const editorRef: React.MutableRefObject<null | undefined> = { current: null };
const defaultProps = {
  content,
  id: 'markdown-id',
  caseId: 'caseId',
  isEditable: true,
  draftStorageKey,
  onChangeEditable,
  onSaveContent,
  fieldName: 'content',
  formSchema: mockSchema,
  editorRef,
};

describe('EditableMarkdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    window.window.sessionStorage.clear();
  });

  it('Save button click calls onSaveContent and onChangeEditable when text area value changed', async () => {
    renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

    fireEvent.change(await screen.findByTestId('euiMarkdownEditorTextArea'), {
      target: { value: newValue },
    });

    await userEvent.click(await screen.findByTestId('editable-save-markdown'));

    await waitFor(() => {
      expect(onSaveContent).toHaveBeenCalledWith(newValue);
    });

    expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
  });

  it('Does not call onSaveContent if no change from current text', async () => {
    renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('editable-save-markdown'));

    await waitFor(() => {
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
    expect(onSaveContent).not.toHaveBeenCalled();
  });

  it('Cancel button click calls only onChangeEditable', async () => {
    renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('editable-cancel-markdown'));

    await waitFor(() => {
      expect(onSaveContent).not.toHaveBeenCalled();
    });

    expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
  });

  describe('errors', () => {
    it('Shows error message and save button disabled if current text is empty', async () => {
      renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

      await userEvent.clear(await screen.findByTestId('euiMarkdownEditorTextArea'));
      await userEvent.click(await screen.findByTestId('euiMarkdownEditorTextArea'));
      await userEvent.paste('');

      expect(await screen.findByText('Required field')).toBeInTheDocument();
      expect(await screen.findByTestId('editable-save-markdown')).toHaveProperty('disabled');
    });

    it('Shows error message and save button disabled if current text is of empty characters', async () => {
      renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

      await userEvent.clear(await screen.findByTestId('euiMarkdownEditorTextArea'));
      await userEvent.click(await screen.findByTestId('euiMarkdownEditorTextArea'));
      await userEvent.paste('  ');

      expect(await screen.findByText('Required field')).toBeInTheDocument();
      expect(await screen.findByTestId('editable-save-markdown')).toHaveProperty('disabled');
    });

    it('Shows error message and save button disabled if current text is too long', async () => {
      const longComment = 'b'.repeat(maxLength + 1);

      renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

      const markdown = await screen.findByTestId('euiMarkdownEditorTextArea');

      await userEvent.click(markdown);
      await userEvent.paste(longComment);

      expect(
        await screen.findByText(
          `The length of the textarea is too long. The maximum length is ${maxLength} characters.`
        )
      ).toBeInTheDocument();
      expect(await screen.findByTestId('editable-save-markdown')).toHaveProperty('disabled');
    });
  });

  describe('draft comment ', () => {
    let user: UserEvent;

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
      window.sessionStorage.removeItem(draftStorageKey);
    });

    beforeEach(() => {
      user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      jest.clearAllMocks();
    });

    it.skip('Save button click clears session storage', async () => {
      renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

      fireEvent.change(await screen.findByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(window.sessionStorage.getItem(draftStorageKey)).toBe(newValue);

      await user.click(await screen.findByTestId(`editable-save-markdown`));

      await waitFor(() => {
        expect(window.sessionStorage.getItem(draftStorageKey)).toBe(null);
      });

      await waitFor(() => {
        expect(onSaveContent).toHaveBeenCalledWith(newValue);
      });

      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
      expect(window.sessionStorage.getItem(draftStorageKey)).toBe(null);
    });

    it.skip('Cancel button click clears session storage', async () => {
      renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

      expect(window.sessionStorage.getItem(draftStorageKey)).toBe('');

      fireEvent.change(await screen.findByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(window.sessionStorage.getItem(draftStorageKey)).toBe(newValue);
      });

      fireEvent.click(await screen.findByTestId('editable-cancel-markdown'));

      await waitFor(() => {
        expect(window.sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });

    describe('existing storage key', () => {
      beforeEach(() => {
        window.sessionStorage.setItem(draftStorageKey, 'value set in storage');
      });

      it('should have session storage value same as draft comment', async () => {
        renderWithTestingProviders(<EditableMarkdown {...defaultProps} />);

        expect(await screen.findByText('value set in storage')).toBeInTheDocument();
      });
    });
  });
});

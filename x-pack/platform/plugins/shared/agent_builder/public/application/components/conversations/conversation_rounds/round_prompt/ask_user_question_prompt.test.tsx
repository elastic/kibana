/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isMac } from '@kbn/shared-ux-utility';
import type {
  AskUserQuestionPromptResponse,
  AskUserQuestionItem,
} from '@kbn/agent-builder-common/agents';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import { AskUserQuestionPrompt } from './ask_user_question_prompt';

const mockReportEvent = jest.fn();

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { analytics: { reportEvent: mockReportEvent } } }),
}));

jest.mock('../../../../hooks/use_conversation', () => ({
  useAgentId: () => 'agent-1',
}));

jest.mock('../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: () => 'conv-1',
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

// The custom ("Be more specific") option has no visible label; its radio/checkbox
// input carries the row test-subj directly.
const getCustomCheckable = () => screen.getByTestId('agentBuilderAskUserQuestionPromptCustomRow');

const singleQuestion: AskUserQuestionItem[] = [
  {
    question: 'Pick a color',
    multi_select: false,
    options: [{ label: 'Red' }, { label: 'Blue' }],
  },
];

const multiQuestion: AskUserQuestionItem[] = [
  {
    question: 'Pick multiple animals',
    multi_select: true,
    options: [{ label: 'Cat' }, { label: 'Dog' }, { label: 'Bird' }],
  },
];

const threeQuestions: AskUserQuestionItem[] = [
  {
    question: 'Q1: pick one',
    multi_select: false,
    options: [{ label: 'A' }, { label: 'B' }],
  },
  {
    question: 'Q2: pick many',
    multi_select: true,
    options: [{ label: 'X' }, { label: 'Y' }, { label: 'Z' }],
  },
  {
    question: 'Q3: pick one',
    multi_select: false,
    options: [{ label: 'P' }, { label: 'Q' }],
  },
];

describe('AskUserQuestionPrompt', () => {
  beforeEach(() => mockReportEvent.mockClear());

  describe('Confirm gating', () => {
    it('Confirm is disabled until the current question is answered', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      const confirm = screen.getByRole('button', { name: 'Submit' });
      expect(confirm).toBeDisabled();

      await userEvent.click(screen.getByLabelText('Red'));
      expect(confirm).toBeEnabled();
    });

    it('Confirm becomes enabled when only "Other" text is provided', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      const confirm = screen.getByRole('button', { name: 'Submit' });
      expect(confirm).toBeDisabled();

      await userEvent.type(screen.getByRole('textbox'), 'magenta');
      expect(confirm).toBeEnabled();
    });
  });

  describe('single-select submission', () => {
    it('Picking a single-select option on the only question auto-submits with { choice: [N] }', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByLabelText('Blue'));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [1] }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('Picking a single-select option on a non-final question auto-advances without onSubmit', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByLabelText('A'));
      expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('multi-select selection', () => {
    it('encodes multiple checked options as a sorted choice array', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByLabelText('Cat'));
      await userEvent.click(screen.getByLabelText('Bird'));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [0, 2] }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('combines choice + custom in multi-select mode', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByLabelText('Cat'));
      await userEvent.type(screen.getByRole('textbox'), 'Fish');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [0], custom: 'Fish' }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('drops custom from the payload when the "Other" checkbox is unchecked', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={onSubmit} />
      );
      await userEvent.type(screen.getByRole('textbox'), 'Fish');
      await userEvent.click(screen.getByLabelText('Cat'));

      // explicitly uncheck the "Other" checkbox
      await userEvent.click(getCustomCheckable());

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [0] }],
      } satisfies AskUserQuestionPromptResponse);
    });
  });

  describe('custom option selection + validation', () => {
    it('shows an error and blocks submit when custom is selected but empty', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      await userEvent.click(getCustomCheckable());
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(
        screen.getByText('Enter a response or choose a different option.')
      ).toBeInTheDocument();
    });

    it('clears the error and submits once text is entered', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      await userEvent.click(getCustomCheckable());
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(
        screen.getByText('Enter a response or choose a different option.')
      ).toBeInTheDocument();

      await userEvent.type(screen.getByRole('textbox'), 'teal');
      expect(
        screen.queryByText('Enter a response or choose a different option.')
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ custom: 'teal' }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('errors when the custom checkbox stays checked but its text is cleared (multi-select)', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={onSubmit} />
      );
      const otherInput = screen.getByRole('textbox');
      await userEvent.type(otherInput, 'Fish');
      await userEvent.clear(otherInput);

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(
        screen.getByText('Enter a response or choose a different option.')
      ).toBeInTheDocument();
    });
  });

  describe('single-select "Other" exclusivity', () => {
    it('typing into "Other" clears the predefined radio', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByLabelText('Red'));
      await userEvent.type(screen.getByRole('textbox'), 'green');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ custom: 'green' }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('clicking a predefined radio deselects custom but keeps its text', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      const otherInput = screen.getByRole('textbox');
      await userEvent.type(otherInput, 'green');
      await userEvent.click(screen.getByLabelText('Blue'));

      // Text stays in the field even though custom is no longer the selected answer.
      expect(otherInput).toHaveValue('green');

      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [1] }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('preserves the custom text across a deselect → reselect round-trip', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      const otherInput = screen.getByRole('textbox');
      await userEvent.type(otherInput, 'green');
      // Switch away to a predefined option, then back to custom.
      await userEvent.click(screen.getByLabelText('Red'));
      await userEvent.click(getCustomCheckable());

      expect(otherInput).toHaveValue('green');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ custom: 'green' }],
      } satisfies AskUserQuestionPromptResponse);
    });
  });

  describe('Skip', () => {
    it('Skip on a non-final question advances and records { skipped: true }', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByRole('button', { name: 'Skip question' }));
      // advanced — Q2 visible
      expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('Skip on the final question submits immediately', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByRole('button', { name: 'Skip question' }));
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ skipped: true }],
      } satisfies AskUserQuestionPromptResponse);
    });
  });

  describe('Back navigation', () => {
    it('returns to the previous question with its prior answer preserved', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={onSubmit} />
      );
      // Q1: pick A and confirm → advance
      await userEvent.click(screen.getByLabelText('A'));
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
      // Now on Q2 — Back becomes available
      await userEvent.click(screen.getByRole('button', { name: 'Back' }));
      // Q1 visible again with A still checked
      expect(screen.getByRole('heading', { name: 'Q1: pick one' })).toBeInTheDocument();
      expect(screen.getByLabelText('A')).toBeChecked();
    });
  });

  describe('Confirm advance vs submit', () => {
    it('Confirm on a non-final question advances without calling onSubmit', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={onSubmit} />
      );
      await userEvent.click(screen.getByLabelText('A'));
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
    });

    it('Confirm on the final question submits the assembled answers array', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={onSubmit} />
      );
      // Q1: A
      await userEvent.click(screen.getByLabelText('A'));
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
      // Q2: skip
      await userEvent.click(screen.getByRole('button', { name: 'Skip question' }));
      // Q3: custom text
      await userEvent.type(screen.getByRole('textbox'), 'free text');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [0] }, { skipped: true }, { custom: 'free text' }],
      } satisfies AskUserQuestionPromptResponse);
    });
  });

  describe('Telemetry', () => {
    it('fires HitlPromptShown on mount', () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      expect(mockReportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.HitlPromptShown,
        expect.objectContaining({ prompt_id: 'p1', total_questions: 1 })
      );
    });

    it('fires HitlQuestionAnswered with outcome=answered on Submit', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      await userEvent.click(screen.getByLabelText('Red'));
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(mockReportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.HitlQuestionAnswered,
        expect.objectContaining({
          prompt_id: 'p1',
          outcome: 'answered',
          question_index: 0,
          is_multi_select: false,
          selected_option_count: 1,
          used_custom_text: false,
        })
      );
    });

    it('fires HitlQuestionAnswered with outcome=skipped on Skip', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      await userEvent.click(screen.getByRole('button', { name: 'Skip question' }));
      expect(mockReportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.HitlQuestionAnswered,
        expect.objectContaining({ outcome: 'skipped', selected_option_count: 0 })
      );
    });

    it('fires HitlQuestionAnswered with outcome=skipped_all on Escape', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      await userEvent.keyboard('{Escape}');
      expect(mockReportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.HitlQuestionAnswered,
        expect.objectContaining({ outcome: 'skipped_all' })
      );
    });

    it('fires HitlQuestionAnswered with used_custom_text=true when Other is filled', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      await userEvent.type(screen.getByRole('textbox'), 'magenta');
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(mockReportEvent).toHaveBeenCalledWith(
        AGENT_BUILDER_EVENT_TYPES.HitlQuestionAnswered,
        expect.objectContaining({ outcome: 'answered', used_custom_text: true })
      );
    });
  });

  describe('Key hints', () => {
    it('renders a notification badge for every option and for the custom row', () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={jest.fn()} />
      );
      // multiQuestion has 3 options → custom row is #4
      ['1', '2', '3', '4'].forEach((n) => {
        const el = screen.getByText(n);
        expect(el.closest('[aria-hidden="true"]')).not.toBeNull();
      });
    });

    it('renders the navigation key hints on the action buttons', () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      expect(screen.getByText('→')).toBeInTheDocument();
      expect(screen.getByText(isMac ? '⌘↵' : 'Ctrl↵')).toBeInTheDocument();
    });

    it('Back button is disabled on question 1 and enabled after advancing', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
      await userEvent.click(screen.getByLabelText('A'));
      expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('digit key picks a single-select option and auto-advances', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      await userEvent.keyboard('1');
      expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
    });

    it('handles shortcuts when a disabled text field outside the prompt holds focus', async () => {
      // Mirrors Kibana's chat input, which is disabled while a HITL prompt is open
      // but may still be the document.activeElement after page load.
      const disabledChatInput = document.createElement('textarea');
      disabledChatInput.disabled = true;
      document.body.appendChild(disabledChatInput);
      try {
        // jsdom won't programmatically focus a disabled element, so simulate
        // the post-load state by inserting a non-disabled element, focusing it,
        // then flipping the disabled flag — Kibana's flow lands on the same
        // activeElement-on-a-disabled-textarea state.
        disabledChatInput.disabled = false;
        disabledChatInput.focus();
        disabledChatInput.disabled = true;
        expect(document.activeElement).toBe(disabledChatInput);

        renderWithProviders(
          <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
        );
        await userEvent.keyboard('1');
        expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
      } finally {
        document.body.removeChild(disabledChatInput);
      }
    });

    it('passes keys through to a live text field outside the prompt', async () => {
      const liveInput = document.createElement('input');
      liveInput.type = 'text';
      document.body.appendChild(liveInput);
      liveInput.focus();
      try {
        renderWithProviders(
          <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
        );
        await userEvent.keyboard('1');
        // Still on Q1 — the digit went to the external input, not our handler.
        expect(screen.getByRole('heading', { name: 'Q1: pick one' })).toBeInTheDocument();
        expect(liveInput).toHaveValue('1');
      } finally {
        document.body.removeChild(liveInput);
      }
    });

    it('digit key auto-submits on the only single-select question', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={onSubmit} />
      );
      await userEvent.keyboard('2');
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [1] }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('digit key toggles an option in multi-select', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={jest.fn()} />
      );
      await userEvent.keyboard('1');
      expect(screen.getByLabelText('Cat')).toBeChecked();
      await userEvent.keyboard('1');
      expect(screen.getByLabelText('Cat')).not.toBeChecked();
    });

    it('out-of-range digit key is ignored', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      // singleQuestion has 2 regular options + 1 custom row → indices 1, 2, 3 are valid
      await userEvent.keyboard('9');
      expect(screen.getByLabelText('Red')).not.toBeChecked();
      expect(screen.getByLabelText('Blue')).not.toBeChecked();
      expect(screen.getByRole('textbox')).not.toHaveFocus();
    });

    it('digit key for the "Be more specific…" row focuses the text input', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      // singleQuestion has 2 options → custom row digit is 3
      await userEvent.keyboard('3');
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('digit keys are suppressed while the custom text input is focused', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={singleQuestion} onSubmit={jest.fn()} />
      );
      const textbox = screen.getByRole('textbox');
      await userEvent.click(textbox);
      expect(textbox).toHaveFocus();
      await userEvent.keyboard('1');
      // '1' typed into the textbox instead of selecting option 1
      expect(textbox).toHaveValue('1');
      expect(screen.getByLabelText('Red')).not.toBeChecked();
    });

    it('Escape skips all remaining questions', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={onSubmit} />
      );
      await userEvent.keyboard('{Escape}');
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ skipped: true }, { skipped: true }, { skipped: true }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('Escape works even while the custom text input is focused', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={onSubmit} />
      );
      await userEvent.type(screen.getByRole('textbox'), 'something');
      await userEvent.keyboard('{Escape}');
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ skipped: true }, { skipped: true }, { skipped: true }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('ArrowRight skips the current question and advances', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
    });

    it('ArrowLeft goes back to the previous question', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      await userEvent.keyboard('1'); // Q1 → Q2 (auto-advance)
      await userEvent.keyboard('{ArrowLeft}');
      expect(screen.getByRole('heading', { name: 'Q1: pick one' })).toBeInTheDocument();
    });

    it('ArrowLeft is suppressed while the custom text input is focused', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      await userEvent.keyboard('1'); // Q1 → Q2
      const textbox = screen.getByRole('textbox');
      await userEvent.click(textbox);
      await userEvent.keyboard('{ArrowLeft}');
      // Still on Q2 — the arrow key didn't trigger Back
      expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
    });

    it('Cmd/Ctrl+Enter submits a multi-select prompt', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={onSubmit} />
      );
      await userEvent.keyboard('1'); // toggle Cat
      await userEvent.keyboard('2'); // toggle Dog
      const modifier = isMac ? '{Meta>}{Enter}{/Meta}' : '{Control>}{Enter}{/Control}';
      await userEvent.keyboard(modifier);
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [0, 1] }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('does not carry focus to the next question after Cmd/Ctrl+Enter from the custom input', async () => {
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={threeQuestions} onSubmit={jest.fn()} />
      );
      // Q1 has 2 regular options → digit 3 selects the custom row and focuses its input.
      await userEvent.keyboard('3');
      expect(screen.getByRole('textbox')).toHaveFocus();
      await userEvent.keyboard('hello');
      const modifier = isMac ? '{Meta>}{Enter}{/Meta}' : '{Control>}{Enter}{/Control}';
      await userEvent.keyboard(modifier);
      // On Q2 the custom input must NOT be auto-focused.
      expect(screen.getByRole('heading', { name: 'Q2: pick many' })).toBeInTheDocument();
      expect(screen.getByRole('textbox')).not.toHaveFocus();
    });

    it('Cmd/Ctrl+Enter fires even while the custom text input is focused', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={onSubmit} />
      );
      await userEvent.type(screen.getByRole('textbox'), 'Fish');
      const modifier = isMac ? '{Meta>}{Enter}{/Meta}' : '{Control>}{Enter}{/Control}';
      await userEvent.keyboard(modifier);
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ custom: 'Fish' }],
      } satisfies AskUserQuestionPromptResponse);
    });

    it('Enter confirms a multi-select prompt when an option is tracked', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <AskUserQuestionPrompt promptId="p1" questions={multiQuestion} onSubmit={onSubmit} />
      );
      await userEvent.keyboard('2'); // toggle Dog
      await userEvent.keyboard('{Enter}');
      expect(onSubmit).toHaveBeenCalledWith({
        answers: [{ choice: [1] }],
      } satisfies AskUserQuestionPromptResponse);
    });
  });
});

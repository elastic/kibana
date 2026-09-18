/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AskUserQuestionItem, AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents';
import { QuestionAnswerList } from './question_answer_list';
import { useAgentColumnFlyoutProps } from '../../../../../hooks/use_agent_panel_width';

const flyoutTitle = i18n.translate('xpack.agentBuilder.conversation.askUserQuestionFlyout.title', {
  defaultMessage: 'Clarification',
});

interface AskUserQuestionFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  questions: AskUserQuestionItem[];
  answers: AskUserQuestionAnswer[];
}

export const AskUserQuestionFlyout: React.FC<AskUserQuestionFlyoutProps> = ({
  isOpen,
  onClose,
  questions,
  answers,
}) => {
  const {
    isAgentWorkspaceMount,
    isOverlay,
    container,
    session,
    hasAnimation,
    type,
    resizable,
    css: agentColumnCss,
  } = useAgentColumnFlyoutProps(isOpen);

  if (!isOpen) return null;

  const total = questions.length;
  const answered = answers.filter((a) => !a.skipped).length;
  const skipped = answers.filter((a) => a.skipped).length;

  const subtitleText = i18n.translate(
    'xpack.agentBuilder.conversation.askUserQuestionFlyout.subtitle',
    {
      defaultMessage: '{total} questions • {answered} answered • {skipped} skipped',
      values: { total, answered, skipped },
    }
  );

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="askUserQuestionFlyoutTitle"
      size="600px"
      ownFocus={!isAgentWorkspaceMount}
      outsideClickCloses={isAgentWorkspaceMount ? isOverlay : undefined}
      container={container}
      session={session}
      hasAnimation={hasAnimation}
      type={type}
      resizable={resizable}
      css={agentColumnCss}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="askUserQuestionFlyoutTitle">{flyoutTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{subtitleText}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <QuestionAnswerList questions={questions} answers={answers} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

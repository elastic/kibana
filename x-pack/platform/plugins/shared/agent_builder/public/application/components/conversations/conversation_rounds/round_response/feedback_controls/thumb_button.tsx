/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';

interface ThumbButtonProps {
  direction: 'up' | 'down';
  isActive: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

export const ThumbButton: React.FC<ThumbButtonProps> = ({
  direction,
  isActive,
  isDisabled,
  onClick,
}) => {
  const label =
    direction === 'up'
      ? i18n.translate('xpack.agentBuilder.feedback.thumbsUp', { defaultMessage: 'Good response' })
      : i18n.translate('xpack.agentBuilder.feedback.thumbsDown', {
          defaultMessage: 'Bad response',
        });

  const ebtAction = isActive
    ? AGENT_BUILDER_UI_EBT.action.conversation.FEEDBACK_RETRACT
    : direction === 'up'
    ? AGENT_BUILDER_UI_EBT.action.conversation.FEEDBACK_THUMB_UP
    : AGENT_BUILDER_UI_EBT.action.conversation.FEEDBACK_THUMB_DOWN;

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={direction === 'up' ? 'thumbUp' : 'thumbDown'}
        aria-label={label}
        aria-pressed={isActive}
        onClick={onClick}
        color={isActive ? 'primary' : 'text'}
        display={isActive ? 'base' : 'empty'}
        size="xs"
        isDisabled={isDisabled}
        data-test-subj={`roundFeedbackThumb-${direction}`}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: ebtAction,
          detail: 'conversation',
        })}
      />
    </EuiToolTip>
  );
};

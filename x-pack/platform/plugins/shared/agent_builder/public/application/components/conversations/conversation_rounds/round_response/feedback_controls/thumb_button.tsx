/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ThumbButtonProps {
  direction: 'up' | 'down';
  isActive: boolean;
  onClick: () => void;
}

export const ThumbButton: React.FC<ThumbButtonProps> = ({ direction, isActive, onClick }) => {
  const label =
    direction === 'up'
      ? i18n.translate('xpack.agentBuilder.feedback.thumbsUp', { defaultMessage: 'Good response' })
      : i18n.translate('xpack.agentBuilder.feedback.thumbsDown', {
          defaultMessage: 'Bad response',
        });

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType={direction === 'up' ? 'thumbUp' : 'thumbDown'}
        aria-label={label}
        onClick={onClick}
        color={isActive ? 'primary' : 'text'}
        display={isActive ? 'base' : 'empty'}
        size="xs"
        data-test-subj={`roundFeedbackThumb-${direction}`}
      />
    </EuiToolTip>
  );
};

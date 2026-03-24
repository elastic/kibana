/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface CloseDockedViewButtonProps {
  onClose?: () => void;
}

export const CloseDockedViewButton: React.FC<CloseDockedViewButtonProps> = ({ onClose }) => {
  return (
    <EuiButtonIcon
      color="text"
      iconType="cross"
      aria-label={i18n.translate(
        'xpack.agentBuilder.embedded.conversationActions.closeConversation',
        {
          defaultMessage: 'Close conversation',
        }
      )}
      onClick={onClose}
      data-test-subj="agentBuilderEmbeddedCloseConversationButton"
    />
  );
};

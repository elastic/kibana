/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { useConversationId } from '../../hooks/use_conversation_id';

export const NewConversationButton: React.FC<{}> = () => {
  const { createOnechatUrl } = useNavigation();
  const conversationId = useConversationId();
  const isDisabled = !conversationId;

  const buttonProps = isDisabled
    ? {
        disabled: true,
      }
    : {
        href: createOnechatUrl(appPaths.chat.new),
      };

  const labels = {
    ariaLabel: i18n.translate('xpack.onechat.newConversationButton.ariaLabel', {
      defaultMessage: 'Create new conversation',
    }),
    display: i18n.translate('xpack.onechat.newConversationButton.display', {
      defaultMessage: 'New',
    }),
  };

  return (
    <EuiButton iconType="plus" iconSide="left" aria-label={labels.ariaLabel} {...buttonProps}>
      {labels.display}
    </EuiButton>
  );
};

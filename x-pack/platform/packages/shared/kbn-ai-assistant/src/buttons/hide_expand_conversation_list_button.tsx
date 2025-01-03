/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type HideExpandConversationListButtonProps = React.ComponentProps<typeof EuiButtonEmpty> & {
  isExpanded: boolean;
};

export function HideExpandConversationListButton(props: HideExpandConversationListButtonProps) {
  return (
    <EuiButtonEmpty
      data-test-subj="observabilityAiAssistantHideExpandConversationListButton"
      iconType={props.isExpanded ? 'menuLeft' : 'menuRight'}
      size="xs"
      {...props}
    >
      {props.isExpanded
        ? i18n.translate('xpack.aiAssistant.hideExpandConversationButton.hide', {
            defaultMessage: 'Hide chats',
          })
        : i18n.translate('xpack.aiAssistant.hideExpandConversationButton.show', {
            defaultMessage: 'Show chats',
          })}
    </EuiButtonEmpty>
  );
}

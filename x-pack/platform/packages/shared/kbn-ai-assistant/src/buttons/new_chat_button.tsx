/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function NewChatButton(
  props: React.ComponentProps<typeof EuiButton> & { collapsed?: boolean }
) {
  const { collapsed, ...nextProps } = props;
  return !props.collapsed ? (
    <EuiButton
      data-test-subj="observabilityAiAssistantNewChatButton"
      iconType="newChat"
      {...nextProps}
    >
      {i18n.translate('xpack.aiAssistant.newChatButton', {
        defaultMessage: 'New conversation',
      })}
    </EuiButton>
  ) : (
    <EuiButtonIcon
      data-test-subj="observabilityAiAssistantNewChatButton"
      iconType="newChat"
      size="xs"
      {...nextProps}
    />
  );
}

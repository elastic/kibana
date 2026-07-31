/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiTitle, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ConversationMetadataFlyoutProps {
  conversationId: string;
  titleId: string;
}

export const ConversationMetadataFlyout: React.FC<ConversationMetadataFlyoutProps> = ({
  conversationId,
  titleId,
}) => (
  <>
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="m">
        <h2 id={titleId}>
          {i18n.translate('xpack.agentBuilder.conversationMetadataFlyout.title', {
            defaultMessage: 'Conversation metadata',
          })}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="xs">
          <pre>{JSON.stringify({ conversationId }, null, 2)}</pre>
        </EuiText>
      </EuiPanel>
    </EuiFlyoutBody>
  </>
);

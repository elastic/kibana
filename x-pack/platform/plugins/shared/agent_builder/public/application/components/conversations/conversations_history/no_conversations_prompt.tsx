/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const NoConversationsPrompt: React.FC = () => {
  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiIcon type="newChat" size="l" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          color="subdued"
          textAlign="center"
          data-test-subj="agentBuilderNoConversationsMessage"
        >
          <p>
            {i18n.translate('xpack.agentBuilder.conversationsHistory.noConversations', {
              defaultMessage: "You haven't started any conversations yet.",
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

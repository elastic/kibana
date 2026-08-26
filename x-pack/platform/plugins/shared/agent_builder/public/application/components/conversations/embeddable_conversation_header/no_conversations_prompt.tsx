/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface NoConversationsPromptProps {
  isFiltered: boolean;
}

export const NoConversationsPrompt: React.FC<NoConversationsPromptProps> = ({ isFiltered }) => {
  const message = isFiltered
    ? i18n.translate('xpack.agentBuilder.embeddableConversationList.noResults', {
        defaultMessage: 'No conversations match your search.',
      })
    : i18n.translate('xpack.agentBuilder.embeddableConversationList.noConversations', {
        defaultMessage: "You haven't started any conversations yet.",
      });

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiIcon type="plusCircle" size="l" color="subdued" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" textAlign="center" size="s">
          <p data-test-subj="agentBuilderEmbeddableNoConversationsMessage">{message}</p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

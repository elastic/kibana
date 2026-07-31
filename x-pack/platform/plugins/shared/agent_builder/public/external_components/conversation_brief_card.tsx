/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiPanel, EuiText, EuiFlexGroup, EuiBadge, EuiCodeBlock } from '@elastic/eui';
import type { ConversationBriefCardProps } from '@kbn/agent-builder-browser';

const noOverflowStyles = css`
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
`;

const getTypeStyles = (type: string) => {
  switch (type) {
    case 'endpoint-compromise':
      return css`
        border: 2px solid red;
      `;
    case 'insider-threat':
      return css`
        border: 2px solid blue;
      `;
    case 'cloud-security-incident':
      return css`
        border: 2px solid green;
      `;
    default:
      return css`
        border: 2px solid black;
      `;
  }
};
export const ConversationBriefCard: React.FC<ConversationBriefCardProps> = ({
  type,
  metadata,
  conversationId,
  onClick,
}) => {
  const typeStyles = getTypeStyles(type);

  return (
    <EuiPanel
      onClick={onClick}
      hasBorder
      hasShadow={false}
      css={[noOverflowStyles, typeStyles]}
      data-test-subj="agentBuilderConversationBriefCard"
    >
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s" wrap>
        <EuiText size="m">
          <p>The infamous brief card for:</p>
        </EuiText>
        <EuiBadge color="primary">{type}</EuiBadge>
      </EuiFlexGroup>
      <EuiText size="m">
        <p>Conversation ID: {conversationId}</p>
      </EuiText>
      {metadata && (
        <EuiCodeBlock language="json" fontSize="s" paddingSize="s" whiteSpace="pre-wrap">
          {JSON.stringify(metadata, null, 2)}
        </EuiCodeBlock>
      )}
    </EuiPanel>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AssistantResponse, ConversationRoundStep } from '@kbn/agent-builder-common';
import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { StreamingText } from './streaming_text';
import { ChatMessageText } from './chat_message_text';
import { RoundResponseActions } from './round_response_actions';
import { FakeAttachment } from './fake_attachment';

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  hasError: boolean;
  isLastRound: boolean;
}

/**
 * Derives a human-readable attachment title by combining:
 * 1. The action the assistant performed (e.g. "Retrieved documents")
 * 2. The data source it acted on (e.g. "e-commerce", "kibana_sample_data")
 */
const deriveTitleFromMessage = (message: string): string => {
  const cleaned = message.replace(/[#*_`>\[\]"]/g, '').trim().toLowerCase();

  // Try to detect the action
  const actionPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /retrieved|fetched|pulled/, label: 'Retrieved documents' },
    { pattern: /query|queried|searched/, label: 'Query results' },
    { pattern: /created|generated|built/, label: 'Generated output' },
    { pattern: /filtered|narrowed/, label: 'Filtered results' },
    { pattern: /aggregat|summar|analyz/, label: 'Analysis results' },
    { pattern: /visuali|chart|graph|plot/, label: 'Visualization' },
  ];
  const action = actionPatterns.find(({ pattern }) => pattern.test(cleaned))?.label ?? 'Results';

  // Try to extract the data source (index name, table name, or quoted identifier)
  const sourcePatterns = [
    /from\s+(?:the\s+)?(\S+?)(?:\s+index|\s+table|\s+dataset)?(?:[.,\s]|$)/,
    /(?:index|table|dataset)\s+(?:called\s+|named\s+)?(\S+)/,
  ];
  let source: string | undefined;
  for (const pattern of sourcePatterns) {
    const match = cleaned.match(pattern);
    if (match?.[1]) {
      source = match[1]
        .replace(/^["']|["']$/g, '')
        .replace(/^kibana_sample_data_/, '')
        .replace(/_/g, ' ');
      break;
    }
  }

  if (source) {
    return `${action} from ${source}`;
  }

  return action;
};

export const RoundResponse: React.FC<RoundResponseProps> = ({
  hasError,
  response: { message },
  steps,
  isLoading,
  isLastRound,
}) => {
  const fakeId = useMemo(() => uuidv4(), []);
  const fakeTitle = useMemo(() => deriveTitleFromMessage(message), [message]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label={i18n.translate('xpack.agentBuilder.round.assistantResponse', {
        defaultMessage: 'Assistant response',
      })}
      data-test-subj="agentBuilderRoundResponse"
      css={css`
        position: relative;
      `}
    >
      <EuiFlexItem>
        {isLoading ? (
          <StreamingText content={message} steps={steps} />
        ) : (
          <>
            <ChatMessageText content={message} steps={steps} />
            <FakeAttachment attachmentId={fakeId} title={fakeTitle} />
          </>
        )}
      </EuiFlexItem>
      {!isLoading && !hasError && (
        <EuiFlexItem grow={false}>
          <RoundResponseActions content={message} isVisible isLastRound={isLastRound} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

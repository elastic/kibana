/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useState } from 'react';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_AGENT_ID } from '../../../../common/investigations/types';
import { useInvestigationsServices } from '../../services';
import { LoadingState } from '../shared';
import * as i18n from './translations';

/** The key Agent Builder reads to find the conversation an embedded chat restores on mount. */
export const getLastConversationStorageKey = (sessionTag: string, agentId: string): string =>
  `agentBuilder.lastConversation.${sessionTag}.${agentId}`;

export const getChatSessionTag = (recordId: string, conversationId: string): string =>
  `investigation-${recordId}-${conversationId}`;

export interface EmbeddedChatProps {
  record: InvestigationRecord;
  /** The main conversation or the id of one of the record's threads. */
  conversationId: string;
  /** Called by the close button of the embedded chat's own header. */
  onClose?: () => void;
}

/**
 * Agent Builder's embeddable conversation. It has no conversation id prop: it restores the
 * conversation stored in localStorage for its session tag and agent, so the id is stored for a
 * tag unique to this record and conversation before the component mounts.
 */
export const EmbeddedChat: React.FC<EmbeddedChatProps> = ({ record, conversationId, onClose }) => {
  const { agentBuilder } = useInvestigationsServices();
  const agentId = record.agent_id ?? INVESTIGATION_AGENT_ID;
  const sessionTag = getChatSessionTag(record.id, conversationId);
  const [preparedTag, setPreparedTag] = useState<string | null>(null);

  useLayoutEffect(() => {
    window.localStorage.setItem(
      getLastConversationStorageKey(sessionTag, agentId),
      JSON.stringify(conversationId)
    );
    setPreparedTag(sessionTag);
  }, [sessionTag, agentId, conversationId]);

  const EmbeddableConversation = agentBuilder?.EmbeddableConversation;

  if (!EmbeddableConversation || preparedTag !== sessionTag) {
    return <LoadingState label={i18n.CHAT_LOADING} size="m" />;
  }

  return (
    <div
      css={css`
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
      `}
      data-test-subj="investigationEmbeddedChat"
    >
      <EmbeddableConversation
        key={sessionTag}
        sessionTag={sessionTag}
        agentId={agentId}
        onClose={onClose}
      />
    </div>
  );
};
EmbeddedChat.displayName = 'EmbeddedChat';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { ClaimFromMessageModal } from './claim_from_message_modal';
import { MessagePickerModal } from './message_picker_modal';
import type { ConversationMessage } from './messages';
import { useConversationMessages } from './use_conversation';
import { usePinnedClaims } from './use_claim_sources';
import type { ClaimSource } from './use_claim_sources';
import * as i18n from './translations';

export interface CreateClaimFromConversationProps {
  record: InvestigationRecord;
  /** The conversation (main or thread) whose messages can be picked. */
  conversationId: string;
}

type Step = { name: 'closed' } | { name: 'pick' } | { name: 'form'; source: ClaimSource };

/** The "Create claim from conversation" button: pick a recent message, then fill in the claim. */
export const CreateClaimFromConversation: React.FC<CreateClaimFromConversationProps> = ({
  record,
  conversationId,
}) => {
  const [step, setStep] = useState<Step>({ name: 'closed' });
  const isOpen = step.name !== 'closed';
  const { messages, isLoading, error } = useConversationMessages(record, conversationId, {
    enabled: isOpen,
  });
  const pinned = usePinnedClaims(record);

  const toSource = (message: ConversationMessage): ClaimSource => ({
    conversationId,
    messageId: message.id,
    label: i18n.MESSAGE_LABEL(message.index),
    authorName: message.authorName,
    ts: message.ts,
    text: message.text,
  });

  const close = () => setStep({ name: 'closed' });

  return (
    <>
      <EuiButton
        size="s"
        iconType={ICONS.claim}
        onClick={() => setStep({ name: 'pick' })}
        data-test-subj="investigationCreateClaimFromConversation"
      >
        {i18n.CREATE_CLAIM}
      </EuiButton>
      {step.name === 'pick' ? (
        <MessagePickerModal
          messages={messages}
          isLoading={isLoading}
          error={error}
          pinned={pinned}
          onPick={(message) => setStep({ name: 'form', source: toSource(message) })}
          onClose={close}
        />
      ) : null}
      {step.name === 'form' ? (
        <ClaimFromMessageModal
          record={record}
          source={step.source}
          onBack={() => setStep({ name: 'pick' })}
          onCreated={close}
          onClose={close}
        />
      ) : null}
    </>
  );
};
CreateClaimFromConversation.displayName = 'CreateClaimFromConversation';

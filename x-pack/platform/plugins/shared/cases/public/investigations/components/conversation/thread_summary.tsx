/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { InvestigationRecord, ThreadRef } from '../../../../common/investigations/types';
import { useCapabilities } from '../../hooks';
import { ICONS } from '../../icons';
import { toExcerpt } from './messages';
import type { ConversationMessage } from './messages';
import { useConversationMessages, useSummarizeThread } from './use_conversation';
import * as i18n from './translations';

/** A summary built from the thread's own messages, for when the agent cannot be asked. */
export const buildDeterministicSummary = (messages: ConversationMessage[]): string | null => {
  const last = messages[messages.length - 1];
  if (!last) {
    return null;
  }
  const authors = Array.from(new Set(messages.map(({ authorName }) => authorName))).join(', ');
  return i18n.THREAD_SUMMARY_DETERMINISTIC(
    messages.length,
    authors,
    last.authorName,
    toExcerpt(last.text, 240)
  );
};

export interface ThreadSummaryProps {
  record: InvestigationRecord;
  thread: ThreadRef;
  /** Called after the agent posted its summary, so the embedded conversation can reload. */
  onAgentSummarized: () => void;
}

/**
 * "Summarize this thread": asks the agent to summarise the thread (a message sent with
 * `trigger_mode: 'always'`). When no model is configured, or the agent fails, it shows a
 * deterministic summary of the thread's messages instead.
 */
export const ThreadSummary: React.FC<ThreadSummaryProps> = ({
  record,
  thread,
  onAgentSummarized,
}) => {
  const { data: capabilities } = useCapabilities();
  const { messages } = useConversationMessages(record, thread.conversation_id, { enabled: true });
  const summarize = useSummarizeThread(record);
  const [localSummary, setLocalSummary] = useState<string | null>(null);
  const [isLocalOpen, setIsLocalOpen] = useState(false);

  const canAskAgent = capabilities?.connector_configured !== false;

  const showLocalSummary = () => {
    setLocalSummary(buildDeterministicSummary(messages));
    setIsLocalOpen(true);
  };

  const ask = () => {
    if (!canAskAgent) {
      showLocalSummary();
      return;
    }
    setIsLocalOpen(false);
    summarize.mutateAsync(thread.conversation_id).then(onAgentSummarized).catch(showLocalSummary);
  };

  return (
    <>
      <EuiButton
        size="s"
        iconType={ICONS.report}
        isLoading={summarize.isLoading}
        onClick={ask}
        aria-label={i18n.THREAD_SUMMARY_SHOW}
        data-test-subj="investigationThreadSummaryButton"
      >
        {summarize.isLoading ? i18n.THREAD_SUMMARY_WORKING : i18n.THREAD_SUMMARY_SHOW}
      </EuiButton>
      {isLocalOpen ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            iconType={ICONS.info}
            title={i18n.THREAD_SUMMARY_DETERMINISTIC_TITLE}
            onDismiss={() => setIsLocalOpen(false)}
            dismissButtonProps={{ 'aria-label': i18n.THREAD_SUMMARY_CLOSE }}
            text={<p>{localSummary ?? i18n.THREAD_SUMMARY_EMPTY}</p>}
            data-test-subj="investigationThreadSummaryLocal"
          />
        </>
      ) : null}
    </>
  );
};
ThreadSummary.displayName = 'ThreadSummary';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import type { VersionedAttachment, AttachmentVersionRef } from '@kbn/onechat-common/attachments';
import { RoundInput } from './round_input';
import { RoundThinking } from './round_thinking/round_thinking';
import { RoundResponse } from './round_response/round_response';
import { RoundAttachmentReferences } from './round_attachment_references';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { RoundError } from './round_error/round_error';
import { useAttachmentViewer } from '../../../hooks/use_attachment_viewer';

interface RoundLayoutProps {
  isCurrentRound: boolean;
  scrollContainerHeight: number;
  rawRound: ConversationRound;
  conversationAttachments?: VersionedAttachment[];
}

/**
 * Extracts attachment references from tool call results in a round.
 * Looks for results with __attachment_operation__ marker.
 */
const extractAttachmentRefs = (round: ConversationRound): AttachmentVersionRef[] => {
  const refs: AttachmentVersionRef[] = [];
  const seen = new Set<string>();

  for (const step of round.steps) {
    if (!isToolCallStep(step)) continue;

    for (const result of step.results) {
      const data = result.data as Record<string, unknown> | undefined;
      if (!data || !data.__attachment_operation__) continue;

      const attachmentId = data.attachment_id as string | undefined;
      const operation = data.__attachment_operation__ as string;

      if (!attachmentId) continue;

      // Determine version based on operation type
      let version: number | undefined;
      if (operation === 'add') {
        version = 1;
      } else if (operation === 'update') {
        version = data.new_version as number | undefined;
      } else if (operation === 'read') {
        version = data.version as number | undefined;
      } else if (operation === 'delete' || operation === 'list' || operation === 'diff') {
        // For delete/list/diff, we reference the current version
        version = data.version as number | undefined;
      }

      if (version) {
        const key = `${attachmentId}-${version}`;
        if (!seen.has(key)) {
          seen.add(key);
          refs.push({ attachment_id: attachmentId, version });
        }
      }
    }
  }

  return refs;
};

const labels = {
  container: i18n.translate('xpack.onechat.round.container', {
    defaultMessage: 'Conversation round',
  }),
};

export const RoundLayout: React.FC<RoundLayoutProps> = ({
  isCurrentRound,
  scrollContainerHeight,
  rawRound,
  conversationAttachments,
}) => {
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);
  const { steps, response, input, model_usage: modelUsage } = rawRound;

  const { isResponseLoading, error, retry: retrySendMessage } = useSendMessage();

  // Extract attachment references from tool calls in this round
  const attachmentRefs = useMemo(() => extractAttachmentRefs(rawRound), [rawRound]);

  // Hook to open attachment viewer
  const { openViewer } = useAttachmentViewer({
    attachments: conversationAttachments,
  });

  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setRoundContainerMinHeight(scrollContainerHeight);
    } else if (!isCurrentRound) {
      setRoundContainerMinHeight(0);
    }
  }, [isCurrentRound, isResponseLoading, scrollContainerHeight]);

  const roundContainerStyles = css`
    ${roundContainerMinHeight > 0 ? `min-height: ${roundContainerMinHeight}px;` : 'flex-grow: 0;'};
  `;

  const isLoadingCurrentRound = isResponseLoading && isCurrentRound;
  const isErrorCurrentRound = Boolean(error) && isCurrentRound;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label={labels.container}
      css={roundContainerStyles}
    >
      {/* Input Message */}
      <EuiFlexItem grow={false}>
        <RoundInput
          input={input.message}
          attachments={input.attachments}
          conversationAttachments={conversationAttachments}
        />
      </EuiFlexItem>

      {/* Thinking */}
      <EuiFlexItem grow={false}>
        {isErrorCurrentRound ? (
          <RoundError error={error} onRetry={retrySendMessage} />
        ) : (
          <RoundThinking steps={steps} isLoading={isLoadingCurrentRound} rawRound={rawRound} />
        )}
      </EuiFlexItem>

      {/* Response Message */}
      <EuiFlexItem grow={false}>
        <EuiFlexItem>
          <RoundResponse
            response={response}
            steps={steps}
            modelUsage={modelUsage}
            isLoading={isLoadingCurrentRound}
          />
        </EuiFlexItem>
      </EuiFlexItem>

      {/* Attachment References from tool calls */}
      {attachmentRefs.length > 0 && (
        <EuiFlexItem grow={false}>
          <RoundAttachmentReferences
            attachmentRefs={attachmentRefs}
            conversationAttachments={conversationAttachments}
            onOpenAttachmentViewer={openViewer}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

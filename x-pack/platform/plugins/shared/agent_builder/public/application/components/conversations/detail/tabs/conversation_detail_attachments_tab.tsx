/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

const labels = {
  empty: i18n.translate('xpack.agentBuilder.conversationDetail.attachments.empty', {
    defaultMessage: 'No attachments on this conversation yet.',
  }),
  version: (version: number) =>
    i18n.translate('xpack.agentBuilder.conversationDetail.attachments.version', {
      defaultMessage: 'v{version}',
      values: { version },
    }),
};

interface ConversationDetailAttachmentsTabProps {
  attachments?: VersionedAttachment[];
}

export const ConversationDetailAttachmentsTab: React.FC<ConversationDetailAttachmentsTabProps> = ({
  attachments = [],
}) => {
  if (attachments.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="paperClip"
        title={
          <h2>
            {i18n.translate('xpack.agentBuilder.conversationDetail.attachments.emptyTitle', {
              defaultMessage: 'No attachments',
            })}
          </h2>
        }
        body={labels.empty}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {attachments.map((attachment) => (
        <EuiFlexItem key={attachment.id} grow={false}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{attachment.type}</strong>
                {attachment.description ? ` — ${attachment.description}` : ''}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {attachment.id} · {labels.version(attachment.current_version)}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

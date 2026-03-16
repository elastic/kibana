/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AttachmentPillsRow } from './conversation_input/attachment_pills_row';

export interface StaleAttachmentsPanelProps {
  attachmentInputs: AttachmentInput[];
  onAddToInput: () => void;
}

export const StaleAttachmentsPanel: React.FC<StaleAttachmentsPanelProps> = ({
  attachmentInputs,
  onAddToInput,
}) => (
  <>
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
      <EuiText size="s">
        <h4>
          <FormattedMessage
            id="xpack.agentBuilder.conversation.staleAttachments.title"
            defaultMessage="Some attachments are out of sync"
          />
        </h4>
        <p>
          <FormattedMessage
            id="xpack.agentBuilder.conversation.staleAttachments.description"
            defaultMessage="These snapshots are older than their source data. Add updated attachments to the input to use them in your next message."
          />
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <AttachmentPillsRow attachments={attachmentInputs} />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={onAddToInput}>
            <FormattedMessage
              id="xpack.agentBuilder.conversation.staleAttachments.stageButton"
              defaultMessage="Add updated attachments to input"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
    <EuiSpacer size="m" />
  </>
);

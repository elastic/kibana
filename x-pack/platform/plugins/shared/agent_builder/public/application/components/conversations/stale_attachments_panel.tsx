/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { borderRadiusXlStyles } from '../../../common.styles';
import { AttachmentPillsRow } from './conversation_input/attachment_pills_row';

export interface StaleAttachmentsPanelProps {
  attachmentInputs: AttachmentInput[];
  onAddToInput: () => void;
  onDismiss: () => void;
}

export const StaleAttachmentsPanel: React.FC<StaleAttachmentsPanelProps> = ({
  attachmentInputs,
  onAddToInput,
  onDismiss,
}) =>
  attachmentInputs.length > 0 ? (
    <>
      <EuiCallOut
        css={borderRadiusXlStyles}
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.agentBuilder.conversation.staleAttachments.title"
            defaultMessage="Some attachments are outdated"
          />
        }
        color="primary"
        iconType="refresh"
        size="s"
      >
        <FormattedMessage
          id="xpack.agentBuilder.conversation.staleAttachments.description"
          defaultMessage="These attachments have newer versions available. Add them to your next message to use the latest data."
        />
        <EuiSpacer size="m" />
        <AttachmentPillsRow attachments={attachmentInputs} />
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton size="s" fill onClick={onAddToInput}>
              <FormattedMessage
                id="xpack.agentBuilder.conversation.staleAttachments.stageButton"
                defaultMessage="Use updated versions"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={onDismiss}>
              <FormattedMessage
                id="xpack.agentBuilder.conversation.staleAttachments.dismissButton"
                defaultMessage="Dismiss"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  ) : null;

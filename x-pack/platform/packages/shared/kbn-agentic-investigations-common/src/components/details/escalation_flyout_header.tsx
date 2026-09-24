/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, FormattedRelative, FormattedTime } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
} from '@elastic/eui';
import { ConversationHeaderBlocks } from './header_blocks';

export interface EscalationFlyoutHeaderProps {
  title: string;
  createdAt: string;
  /** Optional pre-rendered interactive assignee picker from the consuming plugin. */
  assigneesNode?: React.ReactNode;
  /** Status string parsed from `conversation.metadata.status`. */
  status?: string;
  /** Assignee uid list parsed from `conversation.metadata.assignees`. */
  assigneeUids?: string[];
}

/**
 * Header slot for the escalation details flyout.
 *
 * Accepts pre-parsed `status` and `assigneeUids` rather than re-reading the raw conversation
 * metadata. The slot (`EscalationHeaderSlot`) calls `conversationToEscalationHeader` once and
 * passes the derived values here, so the parsing logic lives in one place.
 */
export const EscalationFlyoutHeader = ({
  title,
  createdAt,
  assigneesNode,
  status,
  assigneeUids = [],
}: EscalationFlyoutHeaderProps) => {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <EuiTextTruncate text={title} />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.alertzero.escalationFlyout.header.since"
              defaultMessage="Since {time} ({relative})"
              values={{
                time: <FormattedTime value={createdAt} />,
                relative: <FormattedRelative value={createdAt} />,
              }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ConversationHeaderBlocks
        status={status}
        assigneesNode={assigneesNode}
        assigneeUids={assigneeUids}
        data-test-subj="escalationHeaderBlocks"
      />
    </>
  );
};

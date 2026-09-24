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
import type { Conversation } from '@kbn/agent-builder-common';
import { ConversationHeaderBlocks } from './header_blocks';

export interface EscalationFlyoutHeaderProps {
  conversation: Conversation;
  /** Optional pre-rendered interactive assignee picker from the consuming plugin. */
  assigneesNode?: React.ReactNode;
}

/**
 * Header slot for the escalation details flyout.
 *
 * Reads `status` and `assignees` directly from `conversation.metadata` using the
 * field-name strings that the escalation template declares. The field name constants
 * from `agentic_investigations/common` are deliberately not imported — that would
 * cross a plugin boundary from a package. The values are duplicated here with a
 * comment pointing at the authoritative source.
 *
 * Metadata field keys (see `kbn-agentic-investigations-plugin/common/escalations/constants.ts`):
 *   ESCALATION_STATUS_FIELD = 'status'
 *   ESCALATION_ASSIGNEES_FIELD = 'assignees'
 */
export const EscalationFlyoutHeader = ({
  conversation,
  assigneesNode,
}: EscalationFlyoutHeaderProps) => {
  const { title, created_at: createdAt, metadata } = conversation;

  const status =
    typeof metadata?.status === 'string' && metadata.status.length > 0
      ? metadata.status
      : undefined;

  const assigneeUids: string[] = Array.isArray(metadata?.assignees)
    ? (metadata!.assignees as unknown[]).filter(
        (v): v is string => typeof v === 'string' && v.length > 0
      )
    : [];

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
              id="xpack.agenticInvestigations.escalationFlyout.header.since"
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

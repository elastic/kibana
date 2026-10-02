/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, FormattedRelative, FormattedTime } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import type { Investigation } from '../../types';
import { ConversationHeaderBlocks } from './header_blocks';
import { SEVERITY_LABELS } from './overview_translations';

// Same colors as the investigation card's severity dot (agenticInvestigations).
const SEVERITY_COLORS: Readonly<Record<string, EuiBadgeProps['color']>> = {
  low: 'success',
  medium: 'primary',
  high: 'warning',
  critical: 'danger',
};

export interface ConversationDetailsFlyoutHeaderProps {
  investigation: Investigation;
  /** Optional pre-rendered interactive assignee picker from the consuming plugin. */
  assigneesNode?: React.ReactNode;
  /**
   * Optional pre-rendered interactive status widget from the consuming plugin (e.g. a toggle).
   * Falls back to a read-only badge when absent.
   */
  statusNode?: React.ReactNode;
  /**
   * Optional pre-rendered live state (severity and "Investigating…") from the consuming plugin.
   * When present, it replaces the severity badge read from the conversation.
   */
  liveStateNode?: React.ReactNode;
  /**
   * Optional pre-rendered title from the consuming plugin, for example one that names an
   * investigation Agent Builder has not titled yet. Falls back to the investigation's title.
   */
  titleNode?: React.ReactNode;
}

/**
 * Header slot content. Agent Builder renders this inside its own `EuiFlyoutHeader` and points the
 * flyout's `aria-labelledby` at it, so the title text has to live here.
 */
export const ConversationDetailsFlyoutHeader = ({
  investigation,
  assigneesNode,
  statusNode,
  liveStateNode,
  titleNode,
}: ConversationDetailsFlyoutHeaderProps) => {
  const { title, createdAt, severity } = investigation;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{titleNode ?? <EuiTextTruncate text={title} />}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            {/* A live state node renders the severity itself, from fresher data. */}
            {severity && liveStateNode === undefined && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={SEVERITY_COLORS[severity] ?? 'hollow'}
                  data-test-subj="investigationFlyoutSeverity"
                >
                  {SEVERITY_LABELS[severity] ?? severity}
                </EuiBadge>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.alertzero.detailsFlyout.header.since"
                  defaultMessage="Since {time} ({relative})"
                  values={{
                    time: <FormattedTime value={createdAt} />,
                    relative: <FormattedRelative value={createdAt} />,
                  }}
                />
              </EuiText>
            </EuiFlexItem>
            {liveStateNode && <EuiFlexItem grow={false}>{liveStateNode}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ConversationHeaderBlocks
        status={investigation.status}
        statusNode={statusNode}
        assigneesNode={assigneesNode}
      />
    </>
  );
};

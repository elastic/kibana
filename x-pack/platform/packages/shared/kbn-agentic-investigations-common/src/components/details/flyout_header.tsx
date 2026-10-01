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

const SEVERITY_COLORS: Readonly<Record<string, EuiBadgeProps['color']>> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
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
  /** Optional pre-rendered running state (for example "Investigating…") from the consuming plugin. */
  runningNode?: React.ReactNode;
}

/**
 * Header slot content. Agent Builder renders this inside its own `EuiFlyoutHeader` and points the
 * flyout's `aria-labelledby` at it, so the title text has to live here.
 */
export const ConversationDetailsFlyoutHeader = ({
  investigation,
  assigneesNode,
  statusNode,
  runningNode,
}: ConversationDetailsFlyoutHeaderProps) => {
  const { title, createdAt, severity } = investigation;

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
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            {severity && (
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
            {runningNode && <EuiFlexItem grow={false}>{runningNode}</EuiFlexItem>}
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

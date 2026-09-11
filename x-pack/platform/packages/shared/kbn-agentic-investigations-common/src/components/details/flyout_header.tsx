/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import moment from 'moment';
import { FormattedRelative } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
} from '@elastic/eui';
import type { Investigation } from '../../types';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { InvestigationHeaderBlocks } from './header_blocks';

export interface ConversationDetailsFlyoutHeaderProps {
  investigation: Investigation;
  statusOptions: readonly string[];
  onChangeStatus?: (status: string) => void;
  onChangeAssignee?: (assignee: string) => void;
}

const formatSince = (isoTimestamp: string): string =>
  DETAILS_FLYOUT_LABELS.header.since(moment(isoTimestamp).format('HH:mm'));

/**
 * Header slot content. Agent Builder renders this inside its own `EuiFlyoutHeader` and points the
 * flyout's `aria-labelledby` at it, so the title text has to live here.
 */
export const ConversationDetailsFlyoutHeader = memo<ConversationDetailsFlyoutHeaderProps>(
  ({ investigation, statusOptions, onChangeStatus, onChangeAssignee }) => {
    const { title, createdAt } = investigation;

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
              <span>{formatSince(createdAt)}</span>
              {'('}
              <FormattedRelative value={createdAt} />
              {')'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <InvestigationHeaderBlocks
          investigation={investigation}
          statusOptions={statusOptions}
          onChangeStatus={onChangeStatus}
          onChangeAssignee={onChangeAssignee}
        />
      </>
    );
  }
);

ConversationDetailsFlyoutHeader.displayName = 'ConversationDetailsFlyoutHeader';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { StatusLabelBadge } from './status_label_badge';
import * as i18n from './translations';

export interface StatusCellProps {
  record: InvestigationRecord;
  /** The record's effective status (`getRecordStatus`). */
  status: CaseStatusConfiguration;
}

/** The status label of a record, with a "Paused" badge while its time tracking is paused. */
export const StatusCell: React.FC<StatusCellProps> = ({ record, status }) => (
  <EuiFlexGroup
    gutterSize="xs"
    alignItems="center"
    responsive={false}
    wrap
    css={fitColumnStyles}
    data-test-subj={`investigationStatusCell-${record.display_id}`}
  >
    {/* min-width 0 lets a long custom status label truncate (EuiBadge shows the full text as its title). */}
    <EuiFlexItem grow={false} css={fitColumnStyles}>
      <StatusLabelBadge
        label={status.label}
        category={status.category}
        data-test-subj={`investigationStatusLabel-${record.display_id}`}
      />
    </EuiFlexItem>
    {record.paused_at ? (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            record.pause_reason
              ? i18n.PAUSED_TOOLTIP(record.pause_reason)
              : i18n.PAUSED_TOOLTIP_NO_REASON
          }
        >
          <EuiBadge
            color="hollow"
            tabIndex={0}
            data-test-subj={`investigationPausedBadge-${record.display_id}`}
          >
            {i18n.PAUSED}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);
StatusCell.displayName = 'StatusCell';

const fitColumnStyles = css`
  min-width: 0;
  max-width: 100%;
`;

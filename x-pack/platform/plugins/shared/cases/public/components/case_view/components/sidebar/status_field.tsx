/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import type { CaseStatusConfiguration } from '../../../../../common/types/domain';
import { StatusSelector } from '../../../status/selector';
import { FormattedRelativePreferenceDate } from '../../../formatted_date';
import { STATUS, PAUSED_SINCE, RESUME, RESUME_TO } from '../../translations';

interface Props {
  statuses: CaseStatusConfiguration[];
  selectedStatusKey: string;
  onStatusChange: (status: CaseStatusConfiguration) => void;
  isLoading: boolean;
  isDisabled: boolean;
  /** Set while the case is in a status that pauses time tracking */
  pausedAt?: string | null;
  pauseReason?: string | null;
  /** Where Resume takes the case; undefined hides the action (read-only users) */
  resumeStatus?: CaseStatusConfiguration | null;
  onResume?: () => void;
}

export const StatusField: React.FC<Props> = ({
  statuses,
  selectedStatusKey,
  onStatusChange,
  isLoading,
  isDisabled,
  pausedAt,
  pauseReason,
  resumeStatus,
  onResume,
}) => {
  // Picking a status from a menu of named states is already an explicit choice; asking the
  // reader to confirm it turned a one-click change into three, and the loading state plus the
  // activity feed entry are the acknowledgement. Same for the other attributes below.
  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-status">
      <EuiFormRow
        label={STATUS}
        fullWidth
        helpText={
          pausedAt != null ? (
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              data-test-subj="sidebar-status-paused"
            >
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {PAUSED_SINCE(pauseReason ?? '')}{' '}
                  <FormattedRelativePreferenceDate value={pausedAt} stripMs />
                </EuiText>
              </EuiFlexItem>
              {resumeStatus && onResume && !isDisabled && (
                <EuiFlexItem grow={false}>
                  <EuiLink
                    onClick={onResume}
                    aria-label={RESUME_TO(resumeStatus.label)}
                    data-test-subj="sidebar-status-resume"
                  >
                    {RESUME}
                  </EuiLink>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ) : undefined
        }
      >
        <StatusSelector
          statuses={statuses}
          selectedStatusKey={selectedStatusKey}
          onStatusChange={onStatusChange}
          isLoading={isLoading}
          isDisabled={isDisabled}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
StatusField.displayName = 'StatusField';

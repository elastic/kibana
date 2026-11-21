/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  CASE_STATUS_CATEGORIES,
  CASE_STATUS_CATEGORY_LABELS,
  findStatusByKey,
  getEffectiveStatuses,
  getRecordStatus,
} from '../../../../common/investigations/statuses';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import type {
  InvestigationRecord,
  InvestigationStatus,
} from '../../../../common/investigations/types';
import { useStatuses, useUpdateRecord } from '../../hooks';
import { ICONS } from '../../icons';
import type { OpenModal } from '../modals/modal_props';
import { PausedBadge } from '../shared/paused_badge';
import * as i18n from './translations';

const LIST_WIDTH = '24rem';
const ROW_HEIGHT = 32;
// Group headings are taller than the status rows.
const GROUP_HEIGHT = 44;
const MAX_LIST_HEIGHT = 420;

const CATEGORY_COLORS: Record<InvestigationStatus, 'primary' | 'success' | 'hollow'> = {
  open: 'primary',
  'in-progress': 'success',
  closed: 'hollow',
};

const toOptions = (
  statuses: CaseStatusConfiguration[],
  currentKey: string
): EuiSelectableOption[] =>
  CASE_STATUS_CATEGORIES.flatMap((category) => {
    const inCategory = statuses.filter(
      (status) => status.category === category && (!status.disabled || status.key === currentKey)
    );
    if (inCategory.length === 0) {
      return [];
    }
    return [
      { label: CASE_STATUS_CATEGORY_LABELS[category], isGroupLabel: true },
      ...inCategory.map<EuiSelectableOption>((status) => ({
        key: status.key,
        label: status.label,
        checked: status.key === currentKey ? 'on' : undefined,
        append: status.pausesTimeTracking ? (
          <EuiText size="xs" color="subdued">
            {i18n.STATUS_PAUSES}
          </EuiText>
        ) : undefined,
        'data-test-subj': `investigationStatusOption-${status.key}`,
      })),
    ];
  });

export interface StatusControlProps {
  record: InvestigationRecord;
  openModal: OpenModal;
  isDisabled?: boolean;
}

/**
 * The status of the investigation: the configured statuses grouped by category, the paused state
 * with its Resume action, and the routes into the pause and close modals.
 */
export const StatusControl: React.FC<StatusControlProps> = ({
  record,
  openModal,
  isDisabled = false,
}) => {
  const { data: configuration } = useStatuses();
  const { mutate: updateRecord, isLoading } = useUpdateRecord(record.id);
  const { mutate: resumeRecord, isLoading: isResuming } = useUpdateRecord(record.id, {
    successMessage: i18n.RESUMED,
  });
  const [isOpen, setIsOpen] = useState(false);

  const statuses = useMemo(() => getEffectiveStatuses(configuration?.statuses), [configuration]);
  const current = getRecordStatus(statuses, record);
  const isClosed = record.status === 'closed';
  const options = useMemo(() => toOptions(statuses, current.key), [statuses, current.key]);
  const listHeight = Math.min(
    options.reduce((total, option) => total + (option.isGroupLabel ? GROUP_HEIGHT : ROW_HEIGHT), 0),
    MAX_LIST_HEIGHT
  );

  const resumeTarget = findStatusByKey(statuses, record.resume_to_status_key);
  const isPaused = Boolean(record.paused_at);

  const onChange = (next: EuiSelectableOption[]) => {
    const key = next.find((option) => option.checked === 'on')?.key;
    setIsOpen(false);
    const target = findStatusByKey(statuses, key);
    if (!target || target.key === current.key) {
      return;
    }
    if (target.category === 'closed') {
      openModal('close', { statusKey: target.key });
    } else if (target.pausesTimeTracking) {
      openModal('pause', { statusKey: target.key });
    } else {
      updateRecord({ status_key: target.key });
    }
  };

  const resume = () => {
    resumeRecord(
      resumeTarget
        ? { status_key: resumeTarget.key }
        : { status: record.status === 'in-progress' ? 'in-progress' : 'open' }
    );
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      wrap={false}
      data-test-subj="investigationStatusControl"
    >
      <EuiFlexItem grow={false}>
        {isClosed ? (
          // Closed investigations change status by reopening, which has its own action.
          <EuiToolTip content={i18n.REOPEN_TO_CHANGE_STATUS}>
            <EuiBadge
              color={CATEGORY_COLORS[record.status]}
              tabIndex={0}
              data-test-subj="investigationStatusButton"
            >
              {current.label}
            </EuiBadge>
          </EuiToolTip>
        ) : (
          <EuiPopover
            isOpen={isOpen}
            closePopover={() => setIsOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
            aria-label={i18n.STATUS}
            button={
              <EuiBadge
                color={CATEGORY_COLORS[record.status]}
                iconType={ICONS.chevronDown}
                iconSide="right"
                isDisabled={isDisabled || isLoading}
                onClick={() => setIsOpen((open) => !open)}
                onClickAriaLabel={i18n.CHANGE_STATUS_ARIA(current.label)}
                data-test-subj="investigationStatusButton"
              >
                {current.label}
              </EuiBadge>
            }
          >
            <div
              css={css`
                inline-size: ${LIST_WIDTH};
              `}
            >
              <EuiSelectable
                aria-label={i18n.STATUS}
                singleSelection="always"
                options={options}
                onChange={onChange}
                listProps={{ rowHeight: ROW_HEIGHT, showIcons: true }}
                height={listHeight}
                data-test-subj="investigationStatusList"
              >
                {(list) => list}
              </EuiSelectable>
            </div>
          </EuiPopover>
        )}
      </EuiFlexItem>
      {isPaused && record.paused_at ? (
        <>
          <EuiFlexItem grow={false}>
            <PausedBadge pausedAt={record.paused_at} reason={record.pause_reason} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={ICONS.resume}
              isLoading={isResuming}
              isDisabled={isDisabled}
              onClick={resume}
              data-test-subj="investigationResume"
            >
              {resumeTarget ? i18n.RESUME_TO(resumeTarget.label) : i18n.RESUME}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </>
      ) : null}
    </EuiFlexGroup>
  );
};
StatusControl.displayName = 'StatusControl';

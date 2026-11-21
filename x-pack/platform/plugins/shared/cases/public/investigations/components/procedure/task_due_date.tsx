/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment-timezone';
import type { Moment } from 'moment-timezone';
import { formatAbsoluteUtc } from '../shared';
import * as i18n from './translations';

export interface DueDateLabelProps {
  dueDate: string;
  isOverdue: boolean;
}

/** A due date as relative text; overdue dates are in the danger colour with the absolute date as tooltip. */
export const DueDateLabel: React.FC<DueDateLabelProps> = ({ dueDate, isOverdue }) => (
  <EuiToolTip content={formatAbsoluteUtc(dueDate)}>
    <EuiText
      size="xs"
      color={isOverdue ? 'danger' : 'subdued'}
      component="span"
      tabIndex={0}
      data-test-subj="investigationTaskDueLabel"
      data-overdue={isOverdue}
    >
      <FormattedRelative value={new Date(dueDate)} />
      {isOverdue ? (
        <EuiScreenReaderOnly>
          <span>{i18n.OVERDUE_SCREEN_READER}</span>
        </EuiScreenReaderOnly>
      ) : null}
    </EuiText>
  </EuiToolTip>
);
DueDateLabel.displayName = 'DueDateLabel';

export interface TaskDueDateProps {
  dueDate: string | null;
  isOverdue: boolean;
  title: string;
  isDisabled: boolean;
  /** Null clears the due date. */
  onChange: (dueDate: string | null) => void;
  'data-test-subj': string;
}

/** The due date of a task with a date picker to change or clear it. */
export const TaskDueDate: React.FC<TaskDueDateProps> = ({
  dueDate,
  isOverdue,
  title,
  isDisabled,
  onChange,
  'data-test-subj': dataTestSubj,
}) => {
  const popoverId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Moment | null>(null);

  const open = () => {
    setDraft(dueDate ? moment(dueDate) : moment().add(1, 'day').startOf('hour'));
    setIsOpen(true);
  };
  const save = () => {
    setIsOpen(false);
    const next = draft ? draft.toISOString() : null;
    if (next !== dueDate) {
      onChange(next);
    }
  };
  const clear = () => {
    setIsOpen(false);
    if (dueDate) {
      onChange(null);
    }
  };

  return (
    <EuiPopover
      id={popoverId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      aria-label={i18n.DUE_DATE_ARIA(title)}
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          isDisabled={isDisabled}
          aria-haspopup="true"
          aria-label={i18n.DUE_DATE_ARIA(title)}
          onClick={isOpen ? () => setIsOpen(false) : open}
          data-test-subj={dataTestSubj}
        >
          {dueDate ? (
            <DueDateLabel dueDate={dueDate} isOverdue={isOverdue} />
          ) : (
            <EuiText size="xs" color="subdued" component="span">
              {i18n.NO_DUE_DATE}
            </EuiText>
          )}
        </EuiButtonEmpty>
      }
    >
      <div data-test-subj={`${dataTestSubj}-picker`}>
        <EuiDatePicker
          inline
          showTimeSelect
          selected={draft}
          onChange={(date) => setDraft(date)}
          aria-label={i18n.DUE_DATE_LABEL}
        />
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="danger"
              isDisabled={!dueDate}
              onClick={clear}
              data-test-subj={`${dataTestSubj}-clear`}
            >
              {i18n.CLEAR_DUE_DATE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill
              isDisabled={!draft}
              onClick={save}
              data-test-subj={`${dataTestSubj}-save`}
            >
              {i18n.SAVE_DUE_DATE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
TaskDueDate.displayName = 'TaskDueDate';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { CaseSeverity } from '../../../../common/types/domain';
import type { TaskPriority as TaskPriorityValue } from '../../../../common/investigations/types';
import { SeverityHealth } from '../../../components/severity/config';
import { TASK_PRIORITIES } from './procedure_helpers';
import * as i18n from './translations';

const SEVERITY_BY_PRIORITY: Record<TaskPriorityValue, CaseSeverity> = {
  low: CaseSeverity.LOW,
  medium: CaseSeverity.MEDIUM,
  high: CaseSeverity.HIGH,
  critical: CaseSeverity.CRITICAL,
};

/** A task priority shown with the Cases severity component. */
export const PriorityHealth: React.FC<{ priority: TaskPriorityValue }> = ({ priority }) => (
  <SeverityHealth severity={SEVERITY_BY_PRIORITY[priority]} />
);
PriorityHealth.displayName = 'PriorityHealth';

export interface TaskPriorityProps {
  priority: TaskPriorityValue;
  title: string;
  isDisabled: boolean;
  onChange: (priority: TaskPriorityValue) => void;
  'data-test-subj': string;
}

/** The priority of a task: the Cases severity label that opens a list of the four levels. */
export const TaskPriority: React.FC<TaskPriorityProps> = ({
  priority,
  title,
  isDisabled,
  onChange,
  'data-test-subj': dataTestSubj,
}) => {
  const popoverId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      id={popoverId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      aria-label={i18n.PRIORITY_ARIA(title)}
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          isDisabled={isDisabled}
          aria-haspopup="true"
          aria-label={i18n.PRIORITY_ARIA(title)}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={dataTestSubj}
        >
          <PriorityHealth priority={priority} />
        </EuiButtonEmpty>
      }
    >
      <EuiContextMenuPanel
        items={TASK_PRIORITIES.map((value) => (
          <EuiContextMenuItem
            key={value}
            onClick={() => {
              setIsOpen(false);
              if (value !== priority) {
                onChange(value);
              }
            }}
            data-test-subj={`${dataTestSubj}-option-${value}`}
          >
            <PriorityHealth priority={value} />
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
TaskPriority.displayName = 'TaskPriority';

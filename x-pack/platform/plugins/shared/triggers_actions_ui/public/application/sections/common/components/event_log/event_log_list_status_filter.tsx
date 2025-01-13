/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleAlertingOutcome } from '@kbn/alerting-plugin/common';
import { EuiFilterButton, EuiPopover, EuiFilterGroup, EuiFilterSelectItem } from '@elastic/eui';
import { getIsExperimentalFeatureEnabled } from '../../../../../common/get_experimental_features';
import { EventLogListStatus } from './event_log_list_status';

const statusFilters: RuleAlertingOutcome[] = ['success', 'failure', 'warning', 'unknown'];

interface EventLogListStatusFilterProps {
  selectedOptions: string[];
  onChange: (selectedValues: string[]) => void;
}

export const EventLogListStatusFilter = (props: EventLogListStatusFilterProps) => {
  const { selectedOptions = [], onChange = () => {} } = props;

  const isRuleUsingExecutionStatus = getIsExperimentalFeatureEnabled('ruleUseExecutionStatus');

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemClick = useCallback(
    (newOption: string) => () => {
      if (selectedOptions.includes(newOption)) {
        onChange(selectedOptions.filter((option) => option !== newOption));
        return;
      }
      onChange([...selectedOptions, newOption]);
    },
    [selectedOptions, onChange]
  );

  const onClick = useCallback(() => {
    setIsPopoverOpen((prevIsOpen) => !prevIsOpen);
  }, [setIsPopoverOpen]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        data-test-subj="eventLogStatusFilter"
        button={
          <EuiFilterButton
            data-test-subj="eventLogStatusFilterButton"
            iconType="arrowDown"
            hasActiveFilters={selectedOptions.length > 0}
            numActiveFilters={selectedOptions.length}
            numFilters={selectedOptions.length}
            onClick={onClick}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.eventLogStatusFilterLabel"
              defaultMessage="Response"
            />
          </EuiFilterButton>
        }
      >
        <>
          {statusFilters.map((status) => {
            return (
              <EuiFilterSelectItem
                key={status}
                data-test-subj={`eventLogStatusFilter-${status}`}
                onClick={onFilterItemClick(status)}
                checked={selectedOptions.includes(status) ? 'on' : undefined}
              >
                <EventLogListStatus
                  status={status}
                  useExecutionStatus={isRuleUsingExecutionStatus}
                />
              </EuiFilterSelectItem>
            );
          })}
        </>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

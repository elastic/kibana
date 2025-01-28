/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFilterButton,
  EuiPopover,
  EuiFilterGroup,
  EuiSelectable,
  type EuiSelectableOption,
  type EuiSelectableProps,
} from '@elastic/eui';
import type { RuleStatus } from '../../../../types';

export interface RuleStatusFilterProps {
  selectedStatuses: RuleStatus[];
  dataTestSubj?: string;
  selectDataTestSubj?: string;
  buttonDataTestSubj?: string;
  optionDataTestSubj?: (status: RuleStatus) => string;
  onChange: (selectedStatuses: RuleStatus[]) => void;
}

const ruleStateFilterOptions: Array<{ key: RuleStatus; label: string }> = [
  {
    key: 'enabled',
    label: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilter.enabledOptionText',
      {
        defaultMessage: 'Rule is enabled',
      }
    ),
  },
  {
    key: 'disabled',
    label: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilter.disabledOptionText',
      {
        defaultMessage: 'Rule is disabled',
      }
    ),
  },
  {
    key: 'snoozed',
    label: i18n.translate(
      'xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilter.snoozedOptionText',
      {
        defaultMessage: 'Rule has snoozed',
      }
    ),
  },
];

const getOptionDataTestSubj = (status: RuleStatus) => `ruleStatusFilterOption-${status}`;

export const RuleStatusFilter = (props: RuleStatusFilterProps) => {
  const {
    selectedStatuses = [],
    dataTestSubj = 'ruleStatusFilter',
    selectDataTestSubj = 'ruleStatusFilterSelect',
    buttonDataTestSubj = 'ruleStatusFilterButton',
    optionDataTestSubj = getOptionDataTestSubj,
    onChange = () => {},
  } = props;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const onFilterItemChange: EuiSelectableProps['onChange'] = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions
        .filter(({ checked }) => checked === 'on')
        .map(({ key }) => key as RuleStatus);

      onChange(selected);
    },
    [onChange]
  );

  const onClick = useCallback(() => {
    setIsPopoverOpen((prevIsOpen) => !prevIsOpen);
  }, [setIsPopoverOpen]);

  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      ruleStateFilterOptions.map(({ key, label }) => ({
        key,
        label,
        'data-test-subj': optionDataTestSubj(key),
        checked: selectedStatuses.includes(key) ? 'on' : undefined,
      })),
    [optionDataTestSubj, selectedStatuses]
  );

  return (
    <EuiFilterGroup data-test-subj={dataTestSubj}>
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            data-test-subj={buttonDataTestSubj}
            iconType="arrowDown"
            hasActiveFilters={selectedStatuses.length > 0}
            numActiveFilters={selectedStatuses.length}
            numFilters={selectedStatuses.length}
            onClick={onClick}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.ruleStateFilterButton"
              defaultMessage="Rule state"
            />
          </EuiFilterButton>
        }
      >
        <div data-test-subj={selectDataTestSubj}>
          <EuiSelectable
            options={selectableOptions}
            onChange={onFilterItemChange}
            listProps={{
              bordered: false,
              style: {
                minWidth: 300,
              },
            }}
          >
            {(list) => list}
          </EuiSelectable>
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleStatusFilter as default };

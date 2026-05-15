/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  EuiText,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { GroupByOptions } from '../../types';
import { GroupByFilterButton, GroupBySelectableContainer } from './styles';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { EventType } from '../../analytics/constants';

interface GroupBySelectProps {
  value: GroupByOptions;
  onChange: (value: GroupByOptions) => void;
}

const GROUP_BY_OPTIONS = [
  {
    key: GroupByOptions.None,
    label: i18n.translate('xpack.searchInferenceEndpoints.groupBy.options.none.label', {
      defaultMessage: 'None',
    }),
  },
  {
    key: GroupByOptions.Service,
    label: i18n.translate('xpack.searchInferenceEndpoints.groupBy.options.service.label', {
      defaultMessage: 'Service',
    }),
  },
];

function parseGroupByValue(value: string | undefined): GroupByOptions {
  switch (value) {
    case GroupByOptions.Service:
      return GroupByOptions.Service;
    case GroupByOptions.None:
    default:
      return GroupByOptions.None;
  }
}

export const GroupBySelect = ({ value, onChange }: GroupBySelectProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const usageTracker = useUsageTracker();
  const handleValueChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selectedOption = newOptions.find((option) => option.checked === 'on');
      const parsed = parseGroupByValue(selectedOption?.key);
      usageTracker.count([EventType.GROUP_BY_CHANGED, `${EventType.GROUP_BY_CHANGED}_${parsed}`]);
      onChange(parsed);
      setIsPopoverOpen(false);
    },
    [onChange, usageTracker]
  );
  const { options, selectedOptionLabel } = useMemo(() => {
    let selectedOption = GROUP_BY_OPTIONS[0].label;
    const selectableOptions: EuiSelectableOption[] = GROUP_BY_OPTIONS.map((option) => {
      if (option.key === value) {
        selectedOption = option.label;
        return { ...option, checked: 'on' };
      }
      return option;
    });
    return {
      options: selectableOptions,
      selectedOptionLabel: selectedOption,
    };
  }, [value]);

  return (
    <EuiFilterGroup data-test-subj="group-by-select">
      <EuiPopover
        aria-label={i18n.translate('xpack.searchInferenceEndpoints.groupBy.popover.ariaLabel', {
          defaultMessage: 'Group by options',
        })}
        ownFocus
        button={
          <EuiFilterButton
            data-test-subj="group-by-button"
            iconType="chevronSingleDown"
            css={GroupByFilterButton}
            onClick={() => setIsPopoverOpen((prevValue) => !prevValue)}
            isSelected={isPopoverOpen}
          >
            <EuiText size="s" className="eui-textTruncate">
              {i18n.translate('xpack.searchInferenceEndpoints.groupBy.label', {
                defaultMessage: 'Group: {selectedGroup}',
                values: { selectedGroup: selectedOptionLabel },
              })}
            </EuiText>
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiSelectable
          data-test-subj="group-by-selectable"
          options={options}
          emptyMessage={i18n.translate('xpack.searchInferenceEndpoints.filter.emptyMessage', {
            defaultMessage: 'No options',
          })}
          onChange={handleValueChange}
          singleSelection="always"
          renderOption={(option) => (
            <span data-test-subj={`group-by-option-${option.key}`}>{option.label}</span>
          )}
          listProps={{
            onFocusBadge: false,
          }}
        >
          {(list, _search) => <div css={GroupBySelectableContainer}>{list}</div>}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

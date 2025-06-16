/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFilterButton, EuiPopover, EuiFilterGroup, EuiSelectable } from '@elastic/eui';

interface Filter {
  name: string;
  checked: 'on' | 'off';
}

interface Props {
  filters: Filters;
  onChange(filters: Filters): void;
}

export interface Filters {
  [key: string]: Filter;
}

export function FilterListButton({ onChange, filters }: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const activeFilters = Object.values(filters).filter((v) => (v as Filter).checked === 'on');

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const selectableOptions = Object.entries(filters).map(([filter, item]) => ({
    key: filter,
    label: (item as Filter).name,
    checked: (item as Filter).checked,
    'data-test-subj': 'filterItem',
  }));

  const toggleFilter = (filter: string) => {
    const previousValue = filters[filter].checked;
    const nextValue = previousValue === 'on' ? 'off' : 'on';

    onChange({
      ...filters,
      [filter]: {
        ...filters[filter],
        checked: nextValue,
      },
    });
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={Object.keys(filters).length}
      hasActiveFilters={activeFilters.length > 0}
      numActiveFilters={activeFilters.length}
      data-test-subj="filterButton"
    >
      <FormattedMessage
        id="xpack.idxMgmt.indexTemplatesList.filterButtonLabel"
        defaultMessage="Filter"
      />
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup className="componentTemplates__filterListButton">
      <EuiPopover
        ownFocus
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        data-test-subj="filterList"
      >
        <EuiSelectable
          allowExclusions
          listProps={{
            onFocusBadge: false,
            style: {
              minWidth: 150,
            },
          }}
          options={selectableOptions}
          onChange={(newOptions, event, changedOption) => {
            if (changedOption) {
              toggleFilter(changedOption.key);
            }
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}

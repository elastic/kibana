/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import styled from 'styled-components';

interface FilterPopoverProps {
  buttonLabel: string;
  onSelectedOptionsChanged: Dispatch<SetStateAction<string[]>>;
  options: string[];
  optionsEmptyLabel: string;
  selectedOptions: string[];
}

const ScrollableDiv = styled.div`
  max-height: 250px;
  overflow: auto;
`;

export const toggleSelectedGroup = (
  group: string,
  selectedGroups: string[],
  setSelectedGroups: Dispatch<SetStateAction<string[]>>
): void => {
  const selectedGroupIndex = selectedGroups.indexOf(group);
  const updatedSelectedGroups = [...selectedGroups];
  if (selectedGroupIndex >= 0) {
    updatedSelectedGroups.splice(selectedGroupIndex, 1);
  } else {
    updatedSelectedGroups.push(group);
  }
  return setSelectedGroups(updatedSelectedGroups);
};

/**
 * Popover for selecting a field to filter on
 *
 * @param buttonLabel label on dropdwon button
 * @param onSelectedOptionsChanged change listener to be notified when option selection changes
 * @param options to display for filtering
 * @param optionsEmptyLabel shows when options empty
 * @param selectedOptions manage state of selectedOptions
 */
export const FilterPopoverComponent = ({
  buttonLabel,
  onSelectedOptionsChanged,
  options,
  optionsEmptyLabel,
  selectedOptions,
}: FilterPopoverProps) => {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  return (
    <EuiPopover
      ownFocus
      button={
        <EuiFilterButton
          data-test-subj={`options-filter-popover-button-${buttonLabel}`}
          iconType="arrowDown"
          onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
          isSelected={isTagPopoverOpen}
          numFilters={options.length}
          hasActiveFilters={selectedOptions.length > 0}
          numActiveFilters={selectedOptions.length}
        >
          {buttonLabel}
        </EuiFilterButton>
      }
      isOpen={isTagPopoverOpen}
      closePopover={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      panelPaddingSize="none"
    >
      <ScrollableDiv>
        {options.map((tag, index) => (
          <EuiFilterSelectItem
            checked={selectedOptions.includes(tag) ? 'on' : undefined}
            key={`${index}-${tag}`}
            onClick={() => toggleSelectedGroup(tag, selectedOptions, onSelectedOptionsChanged)}
          >
            {`${tag}`}
          </EuiFilterSelectItem>
        ))}
      </ScrollableDiv>
      {options.length === 0 && (
        <EuiFlexGroup gutterSize="m" justifyContent="spaceAround">
          <EuiFlexItem grow={true}>
            <EuiPanel>
              <EuiText>{optionsEmptyLabel}</EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPopover>
  );
};

FilterPopoverComponent.displayName = 'FilterPopoverComponent';

export const FilterPopover = React.memo(FilterPopoverComponent);

FilterPopover.displayName = 'FilterPopover';

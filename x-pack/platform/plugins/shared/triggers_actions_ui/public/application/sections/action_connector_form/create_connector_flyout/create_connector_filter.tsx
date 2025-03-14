/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiPopover,
  EuiFilterButton,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';

import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';

import { i18n } from '@kbn/i18n';

export interface CreateConnectorFilterProps {
  categoryOptions: EuiSelectableOption[];
  selectedCategories: Array<{ label: string; key: string }>;
  onSelectCategoryChange: (newOptions: EuiSelectableOption[]) => void;
  featureId?: string;
  searchValue: string;
  onSearchValueChange: (value: string) => void;
}

export const CreateConnectorFilter: React.FC<CreateConnectorFilterProps> = ({
  categoryOptions,
  selectedCategories,
  onSelectCategoryChange,
  featureId,
  searchValue,
  onSearchValueChange,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onSearchValueChange(newValue);
  };

  const onMultiFilterButtonClick = () => {
    setIsPopoverOpen((prev) => !prev);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  return (
    <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
      <EuiFlexItem grow={3}>
        <EuiFieldSearch
          fullWidth={true}
          placeholder={i18n.translate(
            'xpack.triggersActionsUI.sections.actionConnectorAdd.searchConnector',
            {
              defaultMessage: 'Search',
            }
          )}
          data-test-subj="createConnectorsModalSearch"
          onChange={handleSearchChange}
          value={searchValue}
        />
      </EuiFlexItem>
      {featureId !== CasesConnectorFeatureId && (
        <EuiFlexItem>
          <EuiFilterGroup>
            <EuiPopover
              button={
                <EuiFilterButton
                  iconType="arrowDown"
                  data-test-subj="compatibilityFilterBtn"
                  isSelected={selectedCategories.length > 0}
                  hasActiveFilters={selectedCategories.length > 0}
                  numActiveFilters={selectedCategories.length}
                  onClick={onMultiFilterButtonClick}
                >
                  {i18n.translate(
                    'xpack.triggersActionsUI.sections.actionConnectorAdd.compatibilityFilter',
                    {
                      defaultMessage: 'Compatibility',
                    }
                  )}
                </EuiFilterButton>
              }
              isOpen={isPopoverOpen}
              closePopover={closePopover}
            >
              <EuiSelectable
                allowExclusions={false}
                options={categoryOptions}
                onChange={onSelectCategoryChange}
                data-test-subj="selectCategory"
              >
                {(list) => <div style={{ width: 300 }}>{list}</div>}
              </EuiSelectable>
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch, EuiComboBox } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export interface FeatureFilterOption {
  value: string;
  label: string;
}

export interface CreateConnectorFilterProps {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  selectedFeatureIds: string[];
  onSelectedFeatureIdsChange: (ids: string[]) => void;
  featureOptions: FeatureFilterOption[];
  featureFilterDisabled?: boolean;
}

export const CreateConnectorFilter: React.FC<CreateConnectorFilterProps> = ({
  searchValue,
  onSearchValueChange,
  selectedFeatureIds,
  onSelectedFeatureIdsChange,
  featureOptions,
  featureFilterDisabled = false,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onSearchValueChange(newValue);
  };

  const comboOptions: Array<EuiComboBoxOptionOption<string>> = featureOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));

  const selectedComboOptions: Array<EuiComboBoxOptionOption<string>> = selectedFeatureIds
    .map((id) => comboOptions.find((option) => option.value === id))
    .filter((option): option is EuiComboBoxOptionOption<string> => option !== undefined);

  const handleFeatureChange = (options: Array<EuiComboBoxOptionOption<string>>) => {
    onSelectedFeatureIdsChange(
      options.map((option) => option.value).filter((value): value is string => value !== undefined)
    );
  };

  return (
    <EuiFlexGroup gutterSize="s" wrap={false} responsive={false}>
      <EuiFlexItem grow={3}>
        <EuiFieldSearch
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionConnectorAdd.searchConnectorLabel',
            {
              defaultMessage: 'Filter available connector types',
            }
          )}
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
      <EuiFlexItem grow={2}>
        <EuiComboBox
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionConnectorAdd.featureFilter.ariaLabel',
            {
              defaultMessage: 'Filter connector types by supported feature',
            }
          )}
          placeholder={i18n.translate(
            'xpack.triggersActionsUI.sections.actionConnectorAdd.featureFilter.placeholder',
            {
              defaultMessage: 'Filter by feature',
            }
          )}
          data-test-subj="createConnectorsModalFeatureFilter"
          options={comboOptions}
          selectedOptions={selectedComboOptions}
          onChange={handleFeatureChange}
          isDisabled={featureFilterDisabled}
          fullWidth
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

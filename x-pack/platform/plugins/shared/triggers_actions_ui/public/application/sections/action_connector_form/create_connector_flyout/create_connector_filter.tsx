/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldSearch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export interface CreateConnectorFilterProps {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
}

export const CreateConnectorFilter: React.FC<CreateConnectorFilterProps> = ({
  searchValue,
  onSearchValueChange,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onSearchValueChange(newValue);
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
    </EuiFlexGroup>
  );
};

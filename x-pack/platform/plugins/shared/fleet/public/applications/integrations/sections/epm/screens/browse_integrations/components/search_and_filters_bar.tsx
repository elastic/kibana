/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const SearchAndFiltersBar = () => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
      <EuiFlexItem grow={true}>
        <EuiFieldSearch
          compressed
          placeholder={i18n.translate(
            'xpack.fleet.epm.browseIntegrations.searchAndFilterBar.searchPlaceholder',
            {
              defaultMessage: 'Search integrations, providers, tools, tags...',
            }
          )}
          fullWidth
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <EuiFilterButton>
            <FormattedMessage
              id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.setupMethodLabel"
              defaultMessage="Setup method"
            />
          </EuiFilterButton>
          <EuiFilterButton>
            <FormattedMessage
              id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.allSignalsLabel"
              defaultMessage="All signals"
            />
          </EuiFilterButton>
          <EuiFilterButton>
            <FormattedMessage
              id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.statusLabel"
              defaultMessage="Status"
            />
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <EuiFilterButton>
            <FormattedMessage
              id="xpack.fleet.epm.browseIntegrations.searchAndFilterBar.sortLabel"
              defaultMessage="Sort"
            />
          </EuiFilterButton>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

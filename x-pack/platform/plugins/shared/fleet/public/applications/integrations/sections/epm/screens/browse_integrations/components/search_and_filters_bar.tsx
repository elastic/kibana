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
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from '@emotion/styled';

export const StickyFlexItem = styled(EuiFlexItem)`
  position: sticky;
  background-color: ${(props) => props.theme.euiTheme.colors.backgroundBasePlain};
  z-index: ${(props) => props.theme.euiTheme.levels.menu};
  top: var(--kbn-application--sticky-headers-offset, var(--kbn-layout--header-height, '0px'));
  padding-top: ${(props) => props.theme.euiTheme.size.m};
`;

interface Props {
  searchTerm?: string;
  setSearchTerm: (searchTerm: string) => void;
}

export const SearchAndFiltersBar: React.FC<Props> = ({ searchTerm, setSearchTerm }) => {
  return (
    <StickyFlexItem>
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      <EuiSpacer size="m" />
    </StickyFlexItem>
  );
};

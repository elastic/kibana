/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiTablePagination,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorCard } from './connector_card';
import { useDataSources } from '../hooks/use_connectors';
import { useAddConnectorFlyout } from '../hooks/use_add_connector_flyout';
import type { Connector } from '../../types/connector';
import {
  DEFAULT_ITEMS_PER_PAGE,
  PAGINATION_ITEMS_PER_PAGE_OPTIONS,
} from '../../../common/constants';

export const DataSourcesView: React.FC = () => {
  const { connectors, isLoading } = useDataSources();
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const { openFlyout, flyout } = useAddConnectorFlyout({
    dataSourceType: selectedConnector?.id,
  });

  const paginatedConnectors = useMemo(() => {
    const start = activePage * itemsPerPage;
    return connectors.slice(start, start + itemsPerPage);
  }, [connectors, activePage, itemsPerPage]);

  const pageCount = Math.ceil(connectors.length / itemsPerPage);

  const handleChangeItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setActivePage(0); // Reset to first page when changing page size
  };

  const handleConnectorClick = useCallback(
    (connector: Connector) => {
      setSelectedConnector(connector);
      // Open the flyout with the connector's action type ID
      // For connectors from registry, this will be the stackConnector.type (e.g., '.notion')
      openFlyout(connector.type);
    },
    [openFlyout]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" css={css({ minHeight: 400 })}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {connectors.length === 0 ? (
        <EuiEmptyPrompt
          iconType="search"
          title={
            <h2>
              {i18n.translate('xpack.dataSources.connectors.noResults', {
                defaultMessage: 'No connectors found',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.dataSources.connectors.noResultsDescription', {
                defaultMessage: 'No connectors available',
              })}
            </p>
          }
        />
      ) : (
        <>
          <EuiFlexGrid columns={4} gutterSize="m">
            {paginatedConnectors.map((connector) => (
              <EuiFlexItem key={connector.id}>
                <ConnectorCard
                  connector={connector}
                  onClick={handleConnectorClick}
                  isDisabled={false}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>

          {connectors.length > itemsPerPage && (
            <>
              <EuiSpacer size="l" />
              <EuiTablePagination
                aria-label={i18n.translate('xpack.dataSources.connectors.paginationLabel', {
                  defaultMessage: 'Connector pagination',
                })}
                pageCount={pageCount}
                activePage={activePage}
                onChangePage={setActivePage}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={PAGINATION_ITEMS_PER_PAGE_OPTIONS}
                onChangeItemsPerPage={handleChangeItemsPerPage}
                data-test-subj="connectorsPagination"
              />
            </>
          )}
        </>
      )}

      {/* Connector creation flyout */}
      {flyout}
    </>
  );
};

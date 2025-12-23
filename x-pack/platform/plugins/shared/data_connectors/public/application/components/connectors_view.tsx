/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiTablePagination,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConnectorCard } from './connector_card';
import { useConnectors } from '../hooks/use_connectors';
import { useAddConnectorFlyout } from '../hooks/use_add_connector_flyout';
import type { Connector } from '../../types/connector';
import { PAGINATION_ITEMS_PER_PAGE_OPTIONS } from '../../../common/constants';

export const ConnectorsView: React.FC = () => {
  const { popularConnectors, allConnectors, isLoading } = useConnectors();
  const { openFlyout, flyout } = useAddConnectorFlyout();
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedAllConnectors = useMemo(() => {
    const start = activePage * itemsPerPage;
    return allConnectors.slice(start, start + itemsPerPage);
  }, [allConnectors, activePage, itemsPerPage]);

  const pageCount = Math.ceil(allConnectors.length / itemsPerPage);

  const handleChangeItemsPerPage = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setActivePage(0); // Reset to first page when changing page size
  };

  const handleConnectorClick = useCallback(
    (connector: Connector) => {
      // Open the flyout with the connector's action type ID
      // For popular connectors from registry, this will be the stackConnector.type (e.g., '.notion')
      openFlyout(connector.type);
    },
    [openFlyout]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 400 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <>
      {popularConnectors.length === 0 && allConnectors.length === 0 ? (
        <EuiEmptyPrompt
          iconType="search"
          title={
            <h2>
              {i18n.translate('xpack.dataConnectors.connectors.noResults', {
                defaultMessage: 'No connectors found',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.dataConnectors.connectors.noResultsDescription', {
                defaultMessage: 'No connectors available',
              })}
            </p>
          }
        />
      ) : (
        <>
          {popularConnectors.length > 0 && (
            <>
              <EuiTitle size="s">
                <h3>
                  {i18n.translate('xpack.dataConnectors.connectors.popularSection', {
                    defaultMessage: 'Popular',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGrid columns={4} gutterSize="m">
                {popularConnectors.map((connector) => (
                  <EuiFlexItem key={connector.id}>
                    <ConnectorCard
                      connector={connector}
                      onClick={handleConnectorClick}
                      isDisabled={false}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>
              <EuiSpacer size="xl" />
            </>
          )}

          {allConnectors.length > 0 && (
            <>
              <EuiTitle size="s">
                <h3>
                  {i18n.translate('xpack.dataConnectors.connectors.allSection', {
                    defaultMessage: 'All',
                  })}
                </h3>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGrid columns={4} gutterSize="m">
                {paginatedAllConnectors.map((connector) => (
                  <EuiFlexItem key={connector.id}>
                    <ConnectorCard
                      connector={connector}
                      onClick={handleConnectorClick}
                      isDisabled={true}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGrid>

              {allConnectors.length > 0 && (
                <>
                  <EuiSpacer size="l" />
                  <EuiTablePagination
                    aria-label={i18n.translate('xpack.dataConnectors.connectors.paginationLabel', {
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
        </>
      )}

      {/* Connector creation flyout */}
      {flyout}
    </>
  );
};

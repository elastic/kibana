/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiTablePagination,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Connector } from '../../../types/connector';
import { useDataSources } from '../../hooks/use_connectors';
import { ConnectorCard } from '../../components/connector_card';
import {
  DEFAULT_ITEMS_PER_PAGE,
  PAGINATION_ITEMS_PER_PAGE_OPTIONS,
} from '../../../../common/constants';

interface SourceSelectionFlyoutProps {
  onClose: () => void;
  onSelectSource: (source: Connector) => void;
}

const ITEMS_PER_ROW = 3;

export const SourceSelectionFlyout: React.FC<SourceSelectionFlyoutProps> = ({
  onClose,
  onSelectSource,
}) => {
  const { connectors: dataSources, isLoading } = useDataSources();
  const [searchQuery, setSearchQuery] = useState('');
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  const sortedSources = useMemo(
    () => [...dataSources].sort((a, b) => a.name.localeCompare(b.name)),
    [dataSources]
  );

  const filteredSources = useMemo(() => {
    if (!searchQuery) return sortedSources;
    const query = searchQuery.toLowerCase();
    return sortedSources.filter((source) => source.name.toLowerCase().includes(query));
  }, [sortedSources, searchQuery]);

  const paginatedSources = useMemo(() => {
    const start = activePage * itemsPerPage;
    return filteredSources.slice(start, start + itemsPerPage);
  }, [filteredSources, activePage, itemsPerPage]);

  const pageCount = Math.ceil(filteredSources.length / itemsPerPage);

  const handleChangeItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setActivePage(0);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setActivePage(0);
  }, []);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby="SourceSelectionFlyoutTitle"
      data-test-subj="sourceSelectionFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="SourceSelectionFlyoutTitle">
            {i18n.translate('xpack.dataSources.sourceSelection.title', {
              defaultMessage: 'Sources',
            })}
          </h2>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.dataSources.sourceSelection.subtitle', {
            defaultMessage: 'Connect your data to power your agents and indices.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFieldSearch
          placeholder={i18n.translate('xpack.dataSources.sourceSelection.searchPlaceholder', {
            defaultMessage: 'Search',
          })}
          value={searchQuery}
          onChange={handleSearchChange}
          incremental
          fullWidth
          data-test-subj="sourceSelectionSearchField"
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '400px' }}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : filteredSources.length === 0 ? (
          <EuiEmptyPrompt
            iconType="search"
            title={
              <h3>
                {i18n.translate('xpack.dataSources.sourceSelection.noSourcesTitle', {
                  defaultMessage: 'No data sources found',
                })}
              </h3>
            }
            body={i18n.translate('xpack.dataSources.sourceSelection.noSourcesBody', {
              defaultMessage: 'Try adjusting your search',
            })}
          />
        ) : (
          <>
            <EuiFlexGrid columns={ITEMS_PER_ROW} gutterSize="m">
              {paginatedSources.map((source) => (
                <EuiFlexItem key={source.id}>
                  <ConnectorCard connector={source} onClick={() => onSelectSource(source)} />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>

            {filteredSources.length > itemsPerPage && (
              <>
                <EuiSpacer size="l" />
                <EuiTablePagination
                  aria-label={i18n.translate('xpack.dataSources.sourceSelection.paginationLabel', {
                    defaultMessage: 'Data source pagination',
                  })}
                  pageCount={pageCount}
                  activePage={activePage}
                  onChangePage={setActivePage}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={PAGINATION_ITEMS_PER_PAGE_OPTIONS}
                  onChangeItemsPerPage={handleChangeItemsPerPage}
                  data-test-subj="sourceSelectionPagination"
                />
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

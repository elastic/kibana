/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiInMemoryTable, EuiSkeletonText, EuiText } from '@elastic/eui';
import React, { memo, useEffect, useState } from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { useListConnectors } from '../../../hooks/tools/use_mcp_connectors';
import { labels } from '../../../utils/i18n';
import { useConnectorsTableColumns } from './connectors_table_columns';
import { ConnectorsTableHeader } from './connectors_table_header';
import { connectorQuickActionsHoverStyles } from './connectors_table_quick_actions';
import { useConnectorsTableSearch } from './connectors_table_search';

export const AgentBuilderConnectorsTable = memo(() => {
  const { connectors, isLoading, error } = useListConnectors({});
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorItem[]>([]);
  const columns = useConnectorsTableColumns();
  const { searchConfig, results: tableConnectors } = useConnectorsTableSearch();

  useEffect(() => {
    setTablePageIndex(0);
  }, [tableConnectors]);

  return (
    <EuiInMemoryTable
      tableCaption={labels.connectors.tableCaption(connectors.length)}
      data-test-subj="agentBuilderConnectorsTable"
      css={[
        ({ euiTheme }) => ({
          borderTop: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
          '& table': {
            backgroundColor: 'transparent',
          },
        }),
        connectorQuickActionsHoverStyles,
      ]}
      childrenBetween={
        <ConnectorsTableHeader
          isLoading={isLoading}
          pageIndex={tablePageIndex}
          pageSize={tablePageSize}
          connectors={tableConnectors}
          total={connectors.length}
          selectedConnectors={selectedConnectors}
          setSelectedConnectors={setSelectedConnectors}
        />
      }
      loading={isLoading}
      columns={columns}
      items={tableConnectors}
      itemId="id"
      error={error ? labels.connectors.listConnectorsErrorMessage : undefined}
      search={searchConfig}
      onTableChange={({ page }: CriteriaWithPagination<ConnectorItem>) => {
        if (page) {
          setTablePageIndex(page.index);
          if (page.size !== tablePageSize) {
            setTablePageSize(page.size);
            setTablePageIndex(0);
          }
        }
      }}
      pagination={{
        pageIndex: tablePageIndex,
        pageSize: tablePageSize,
        pageSizeOptions: [10, 25, 50, 100],
        showPerPageOptions: true,
      }}
      rowProps={(connector) => ({
        'data-test-subj': `agentBuilderConnectorsTableRow-${connector.id}`,
      })}
      selection={{
        selectable: (connector) => !connector.isPreconfigured,
        onSelectionChange: (selectedItems: ConnectorItem[]) => {
          setSelectedConnectors(selectedItems);
        },
        selected: selectedConnectors,
      }}
      noItemsMessage={
        isLoading ? (
          <EuiSkeletonText lines={1} />
        ) : (
          <EuiText component="p" size="s" textAlign="center" color="subdued">
            {connectors.length > 0 && tableConnectors.length === 0
              ? labels.connectors.noConnectorsMatchMessage
              : labels.connectors.noConnectorsMessage}
          </EuiText>
        )
      }
    />
  );
});

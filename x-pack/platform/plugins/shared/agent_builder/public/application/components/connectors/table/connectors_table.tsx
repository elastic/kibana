/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiInMemoryTable, EuiSkeletonText, EuiText, useEuiTheme } from '@elastic/eui';
import React, { memo, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { labels } from '../../../utils/i18n';
import { useConnectorsTableColumns } from './connectors_table_columns';
import { ConnectorsTableHeader } from './connectors_table_header';
import { connectorQuickActionsHoverStyles } from './connectors_table_quick_actions';
import { useConnectorsTableSearch } from './connectors_table_search';

interface ConnectorsTableProps {
  connectors: readonly ConnectorItem[];
  isLoading: boolean;
  error: unknown;
}

export const AgentBuilderConnectorsTable = memo((props: ConnectorsTableProps) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [selectedConnectors, setSelectedConnectors] = useState<ConnectorItem[]>([]);
  const columns = useConnectorsTableColumns();
  const { searchConfig, results: tableConnectors } = useConnectorsTableSearch(props.connectors);

  useEffect(() => {
    setTablePageIndex(0);
  }, [tableConnectors]);

  const { euiTheme } = useEuiTheme();
  const { isEarsEnabled } = useAgentBuilderServices();

  const isDisabledEarsConnector = (connector: ConnectorItem): boolean =>
    !isEarsEnabled && connector.config?.authType === 'ears';

  const disabledRowCss = css({ backgroundColor: euiTheme.colors.lightestShade });

  return (
    <EuiInMemoryTable
      tableCaption={labels.connectors.tableCaption(props.connectors.length)}
      data-test-subj="agentBuilderConnectorsTable"
      css={[
        ({ euiTheme: theme }) => ({
          borderTop: `1px solid ${theme.colors.borderBaseSubdued}`,
          '& table': {
            backgroundColor: 'transparent',
          },
        }),
        connectorQuickActionsHoverStyles,
      ]}
      childrenBetween={
        <ConnectorsTableHeader
          isLoading={props.isLoading}
          pageIndex={tablePageIndex}
          pageSize={tablePageSize}
          connectors={tableConnectors}
          total={props.connectors.length}
          selectedConnectors={selectedConnectors}
          setSelectedConnectors={setSelectedConnectors}
        />
      }
      loading={props.isLoading}
      columns={columns}
      items={tableConnectors}
      itemId="id"
      error={props.error ? labels.connectors.listConnectorsErrorMessage : undefined}
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
        ...(isDisabledEarsConnector(connector) ? { css: disabledRowCss } : {}),
      })}
      selection={{
        selectable: (connector) => !connector.isPreconfigured,
        onSelectionChange: (selectedItems: ConnectorItem[]) => {
          setSelectedConnectors(selectedItems);
        },
        selected: selectedConnectors,
      }}
      noItemsMessage={
        props.isLoading ? (
          <EuiSkeletonText lines={1} />
        ) : (
          <EuiText component="p" size="s" textAlign="center" color="subdued">
            {props.connectors.length > 0 && tableConnectors.length === 0
              ? labels.connectors.noConnectorsMatchMessage
              : labels.connectors.noConnectorsMessage}
          </EuiText>
        )
      }
    />
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, UseEuiTheme } from '@elastic/eui';
import { EuiEmptyPrompt, EuiImage, EuiInMemoryTable, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { OAuthClient } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import React, { memo, useEffect, useState } from 'react';
import { useOAuthClients } from '../../hooks/oauth_clients/use_oauth_clients';
import { labels } from '../../utils/i18n';
import illustrationGenai from './assets/illustration_genai.svg';
import { useMcpClientsTableColumns } from './mcp_clients_table_columns';
import { McpClientsTableHeader } from './mcp_clients_table_header';
import { useMcpClientsTableSearch } from './mcp_clients_table_search';

const mcpClientsTableStyles =
  (hasClients: boolean) =>
  ({ euiTheme }: UseEuiTheme) =>
    !hasClients
      ? css`
          .euiTableRow {
            &:hover {
              background-color: transparent;
            }

            .euiTableRowCell {
              border-block-end: none;
            }
          }
        `
      : css`
          border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
          table {
            background-color: transparent;
          }
        `;

const emptyPromptStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-top: ${euiTheme.size.xl};
`;

export const McpClientsTable = memo(() => {
  const { clients, isLoading, error } = useOAuthClients();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const columns = useMcpClientsTableColumns();
  const { searchConfig, results: tableClients } = useMcpClientsTableSearch({ clients });

  const hasClients = clients.length > 0;

  useEffect(() => {
    setPageIndex(0);
  }, [tableClients]);

  return (
    <EuiInMemoryTable
      data-test-subj="agentBuilderMcpClientsListTable"
      tableCaption={i18n.translate('xpack.agentBuilder.mcpClients.tableCaption', {
        defaultMessage: 'List of registered MCP OAuth clients',
      })}
      css={mcpClientsTableStyles(hasClients)}
      childrenBetween={
        <McpClientsTableHeader
          isLoading={isLoading}
          pageIndex={pageIndex}
          pageSize={pageSize}
          clients={tableClients}
          total={clients.length}
        />
      }
      rowProps={(row) => ({
        'data-test-subj': `agentBuilderMcpClientsListRow-${row.id}`,
      })}
      items={tableClients}
      itemId="id"
      columns={columns}
      sorting={{ sort: { field: 'client_name', direction: 'asc' } }}
      search={searchConfig}
      pagination={{
        pageIndex,
        pageSize,
        pageSizeOptions: [10, 25, 50, 100],
        showPerPageOptions: true,
      }}
      onTableChange={({ page }: CriteriaWithPagination<OAuthClient>) => {
        if (page) {
          setPageIndex(page.index);
          if (page.size !== pageSize) {
            setPageSize(page.size);
            setPageIndex(0);
          }
        }
      }}
      loading={isLoading}
      error={error ? labels.tools.mcpClients.listMcpClientsErrorMessage : undefined}
      noItemsMessage={
        !isLoading ? (
          hasClients ? (
            <EuiText component="p" size="s" textAlign="center" color="subdued">
              {labels.tools.mcpClients.noMcpClientsFoundMessage}
            </EuiText>
          ) : (
            <EuiEmptyPrompt
              css={emptyPromptStyles}
              icon={
                <EuiImage
                  src={illustrationGenai}
                  alt={i18n.translate('xpack.agentBuilder.mcpClients.noMcpClientsPromptIconAlt', {
                    defaultMessage: 'Empty MCP clients list image',
                  })}
                  size="150px"
                />
              }
              title={<h2>{labels.tools.mcpClients.noMcpClientsPromptTitle}</h2>}
              body={<p>{labels.tools.mcpClients.noMcpClientsPromptBody}</p>}
              // TODO: Implement as part of "[Agent Builder] OAuth Client registration and management flows"
              // actions={[
              //   <EuiButton>{labels.tools.mcpClients.addMcpClientButtonLabel}</EuiButton>,
              //   <EuiLink href={'#'} target="_blank">
              //     {labels.tools.mcpClients.noItemsPromptLearnMoreLinkLabel}
              //   </EuiLink>,
              // ]}
            />
          )
        ) : null
      }
      responsiveBreakpoint={false}
    />
  );
});

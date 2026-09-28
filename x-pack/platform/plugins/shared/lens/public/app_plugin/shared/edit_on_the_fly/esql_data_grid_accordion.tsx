/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiTitle,
  EuiAccordion,
  EuiSpacer,
  EuiFlexItem,
  EuiIconTip,
  EuiNotificationBadge,
  EuiPanel,
  EuiProgress,
  EuiText,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import type { ESQLDataGridAttrs } from './helpers';

interface ESQLDataGridAccordionProps {
  isAccordionOpen: boolean;
  dataGridAttrs?: ESQLDataGridAttrs;
  isLoading: boolean;
  hasQueryError: boolean;
  query: AggregateQuery;
  isTableView: boolean;
  isApproximate: boolean;
  onToggle: (isOpen: boolean) => void;
}

export const ESQLDataGridAccordion = ({
  isAccordionOpen,
  dataGridAttrs,
  isLoading,
  hasQueryError,
  query,
  isTableView,
  isApproximate,
  onToggle,
}: ESQLDataGridAccordionProps) => {
  const styles = useMemoCss(componentStyles);
  const fillsAvailableSpace = isAccordionOpen && Boolean(dataGridAttrs);
  const queryErrorLabel = i18n.translate('xpack.lens.config.ESQLQueryResultsErrorLabel', {
    defaultMessage: 'Query error',
  });

  const hasRows = Boolean(dataGridAttrs?.rows.length);
  const isAccordionLoading = isLoading && !hasRows;
  const showQueryError = hasQueryError && !dataGridAttrs && !isLoading;

  return (
    <EuiFlexItem
      grow={fillsAvailableSpace ? 1 : false}
      data-test-subj="ESQLQueryResults"
      css={[
        styles.wrapper,
        isAccordionLoading && styles.loading,
        fillsAvailableSpace ? styles.expanded : styles.collapsed,
      ]}
    >
      <EuiAccordion
        id="esql-results"
        css={styles.stableHorizontalScrollbar}
        buttonContent={
          <EuiTitle size="xxs" css={styles.title}>
            <h5>
              {i18n.translate('xpack.lens.config.ESQLQueryResultsTitle', {
                defaultMessage: 'ES|QL Query Results',
              })}
            </h5>
          </EuiTitle>
        }
        buttonProps={{ paddingSize: 'm' }}
        initialIsOpen={isAccordionOpen}
        forceState={isAccordionOpen ? 'open' : 'closed'}
        onToggle={onToggle}
        extraAction={
          dataGridAttrs ? (
            <EuiNotificationBadge size="m" color="subdued">
              {dataGridAttrs.rows.length}
            </EuiNotificationBadge>
          ) : showQueryError ? (
            <EuiIconTip
              type="error"
              color="danger"
              position="left"
              aria-label={queryErrorLabel}
              content={queryErrorLabel}
              disableScreenReaderOutput
              iconProps={{ 'data-test-subj': 'ESQLQueryResultsErrorIcon' }}
            />
          ) : undefined
        }
        isLoading={isAccordionLoading}
        isLoadingMessage
      >
        {showQueryError && (
          <EuiPanel
            color="subdued"
            paddingSize="m"
            css={styles.emptyMessage}
            data-test-subj="ESQLQueryResultsEmpty"
          >
            <EuiText size="s" color="subdued" textAlign="center">
              <p>
                {i18n.translate('xpack.lens.config.ESQLQueryResultsErrorMessage', {
                  defaultMessage:
                    'The query returned an error. See the errors in the query editor above.',
                })}
              </p>
            </EuiText>
          </EuiPanel>
        )}
        {dataGridAttrs && (
          <div css={styles.gridContainer}>
            {isLoading && hasRows && (
              <EuiProgress
                size="xs"
                color="accent"
                position="absolute"
                data-test-subj="ESQLQueryResultsRefreshing"
              />
            )}
            <ESQLDataGrid
              rows={dataGridAttrs.rows}
              columns={dataGridAttrs.columns}
              dataView={dataGridAttrs.dataView}
              query={query}
              flyoutType="overlay"
              isTableView={isTableView}
              isApproximate={isApproximate}
              initialRowHeight={0}
              controlColumnIds={['openDetails']}
            />
            <EuiSpacer />
          </div>
        )}
      </EuiAccordion>
    </EuiFlexItem>
  );
};

const componentStyles = {
  wrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingInline: euiTheme.size.base,
      borderBlockEnd: euiTheme.border.thin,
    }),
  // EuiAccordion exposes no API for a content area that grows with its container,
  // so the internal class name is the only way to hand it the remaining space.
  expanded: css({
    '.euiAccordion__childWrapper': { flex: 1 },
  }),
  collapsed: css({
    '.euiAccordion__childWrapper': { flex: 'none' },
  }),
  // EuiAccordion's paddingSize also pads the top, which pushes the loading message
  // away from the header, so the loading content is padded through its class instead.
  loading: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.euiAccordion__children': {
        padding: `0 ${euiTheme.size.base} ${euiTheme.size.base}`,
      },
    }),
  // Prevents the horizontal scrollbar from toggling on/off as the accordion's
  // height-animating ancestor resizes, which otherwise feeds back into EUI's
  // column-width/ResizeObserver calculation and can hang the tab. Raw CSS because
  // csstype declares overflow-x as a closed union, which rejects `!important`.
  stableHorizontalScrollbar: css`
    .euiDataGrid__virtualized {
      overflow-x: scroll !important;
    }
  `,
  gridContainer: css({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    alignSelf: 'stretch',
    minBlockSize: 0,
  }),
  title: ({ euiTheme }: UseEuiTheme) => css({ padding: euiTheme.size.xxs }),
  emptyMessage: ({ euiTheme }: UseEuiTheme) => css({ marginBlockEnd: euiTheme.size.m }),
};

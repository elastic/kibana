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
  EuiIcon,
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
  const isEmpty = !isLoading && !dataGridAttrs;
  const fillsAvailableSpace = isAccordionOpen && Boolean(dataGridAttrs);

  return (
    <EuiFlexItem
      grow={fillsAvailableSpace ? 1 : false}
      data-test-subj="ESQLQueryResults"
      css={[styles.wrapper, fillsAvailableSpace ? styles.expanded : styles.collapsed]}
    >
      <EuiAccordion
        id="esql-results"
        css={dataGridAttrs ? styles.gridFill : undefined}
        buttonContent={
          <EuiTitle size="xxs" css={styles.title}>
            <h5>
              {i18n.translate('xpack.lens.config.ESQLQueryResultsTitle', {
                defaultMessage: 'ES|QL Query Results',
              })}
            </h5>
          </EuiTitle>
        }
        buttonProps={{
          paddingSize: 'm',
        }}
        initialIsOpen={isAccordionOpen}
        forceState={isAccordionOpen ? 'open' : 'closed'}
        onToggle={onToggle}
        extraAction={
          dataGridAttrs ? (
            <EuiNotificationBadge size="m" color="subdued">
              {dataGridAttrs.rows.length}
            </EuiNotificationBadge>
          ) : hasQueryError ? (
            <EuiIcon
              type="error"
              color="danger"
              aria-label={i18n.translate('xpack.lens.config.ESQLQueryResultsErrorLabel', {
                defaultMessage: 'Query error',
              })}
              data-test-subj="ESQLQueryResultsErrorIcon"
            />
          ) : undefined
        }
        isLoading={isLoading}
        // Keep the previous table visible while refreshing; only take over the
        // content area when there is nothing to show yet.
        isLoadingMessage={!dataGridAttrs}
      >
        {isAccordionOpen && isEmpty && (
          <EuiPanel
            color="subdued"
            paddingSize="m"
            css={styles.emptyMessage}
            data-test-subj="ESQLQueryResultsEmpty"
          >
            <EuiText size="s" color="subdued" textAlign="center">
              <p>
                {i18n.translate('xpack.lens.config.ESQLQueryResultsUnavailable', {
                  defaultMessage: 'No results to display',
                })}
              </p>
            </EuiText>
          </EuiPanel>
        )}
        {isAccordionOpen && dataGridAttrs && (
          <div css={styles.gridContainer}>
            {isLoading && (
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
  expanded: css({ '.euiAccordion__childWrapper': { flex: 1 } }),
  collapsed: css({ '.euiAccordion__childWrapper': { flex: 'none' } }),
  /**
   * Escape hatches into EuiAccordion and EuiDataGrid internals, applied only while the
   * grid is rendered so EuiAccordion's own loading message keeps its default layout.
   */
  gridFill: css(
    {
      '.euiAccordion__children': {
        display: 'flex',
        flexDirection: 'column',
        blockSize: '100%',
      },
    },
    // Prevents the horizontal scrollbar from toggling on/off as the accordion's
    // height-animating ancestor resizes, which otherwise feeds back into EUI's
    // column-width/ResizeObserver calculation and can hang the tab. Raw CSS because
    // csstype declares overflow-x as a closed union, which rejects `!important`.
    css`
      .euiDataGrid__virtualized {
        overflow-x: scroll !important;
      }
    `
  ),
  // EuiAccordion's loading style centres its children while refreshing; stretch ours so the
  // grid keeps the full width. The top padding gives the refreshing bar its own band above
  // the grid toolbar.
  gridContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      paddingBlockStart: euiTheme.size.xxs,
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      alignSelf: 'stretch',
      minBlockSize: 0,
    }),
  title: ({ euiTheme }: UseEuiTheme) => css({ padding: euiTheme.size.xxs }),
  emptyMessage: ({ euiTheme }: UseEuiTheme) => css({ marginBlockEnd: euiTheme.size.m }),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiTitle,
  EuiAccordion,
  EuiSpacer,
  EuiFlexItem,
  EuiNotificationBadge,
  useEuiTheme,
} from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import type { ESQLDataGridAttrs } from './helpers';

export type ESQLDataGridAccordionStatus = 'loading' | 'ready' | 'error';

interface ESQLDataGridAccordionProps {
  isAccordionOpen: boolean;
  dataGridAttrs?: ESQLDataGridAttrs;
  status: ESQLDataGridAccordionStatus;
  query: AggregateQuery;
  isTableView: boolean;
  isApproximate: boolean;
  setIsAccordionOpen: (flag: boolean) => void;
  onAccordionToggleCb: (status: boolean) => void;
}

export const ESQLDataGridAccordion = ({
  isAccordionOpen,
  dataGridAttrs,
  status,
  query,
  isTableView,
  isApproximate,
  setIsAccordionOpen,
  onAccordionToggleCb,
}: ESQLDataGridAccordionProps) => {
  const onAccordionToggle = useCallback(
    (openStatus: boolean) => {
      setIsAccordionOpen(!isAccordionOpen);
      onAccordionToggleCb(openStatus);
    },
    [isAccordionOpen, onAccordionToggleCb, setIsAccordionOpen]
  );
  const { euiTheme } = useEuiTheme();

  const extraAction =
    dataGridAttrs || status === 'error' ? (
      <EuiNotificationBadge size="m" color="subdued">
        {dataGridAttrs ? dataGridAttrs.rows.length : '—'}
      </EuiNotificationBadge>
    ) : undefined;

  return (
    <EuiFlexItem
      grow={isAccordionOpen ? 1 : false}
      data-test-subj="ESQLQueryResults"
      css={css`
        .euiAccordion__childWrapper {
          flex: ${isAccordionOpen ? 1 : 'none'};
        }
        padding: 0 ${euiTheme.size.base};
        border-bottom: ${euiTheme.border.thin};
      `}
    >
      <EuiAccordion
        id="esql-results"
        css={css`
          .euiAccordion__children {
            display: flex;
            flex-direction: column;
            height: 100%;
            /* EuiAccordion's isLoading style sets align-items: center, which in this
             * column layout would shrink the grid to its content width while refreshing. */
            align-items: stretch;
          }
          .euiDataGrid__virtualized {
            /* Prevents the horizontal scrollbar from toggling on/off as the accordion's
             * height-animating ancestor resizes, which otherwise feeds back into EUI's
             * column-width/ResizeObserver calculation and can hang the tab. */
            overflow-x: scroll !important;
          }
        `}
        buttonContent={
          <EuiTitle
            size="xxs"
            css={css`
              padding: 2px;
            `}
          >
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
        onToggle={onAccordionToggle}
        extraAction={extraAction}
        isLoading={status === 'loading'}
        isLoadingMessage={!dataGridAttrs}
      >
        {isAccordionOpen && dataGridAttrs && (
          <>
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
          </>
        )}
      </EuiAccordion>
    </EuiFlexItem>
  );
};

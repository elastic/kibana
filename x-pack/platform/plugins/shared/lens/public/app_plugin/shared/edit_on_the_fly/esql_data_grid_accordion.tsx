/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiTitle, EuiAccordion, EuiSpacer, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';
import { euiThemeVars } from '@kbn/ui-theme';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import type { ESQLDataGridAttrs } from './helpers';

interface ESQLDataGridAccordionProps {
  isAccordionOpen: boolean;
  dataGridAttrs: ESQLDataGridAttrs;
  query: AggregateQuery;
  isTableView: boolean;
  setIsAccordionOpen: (flag: boolean) => void;
  onAccordionToggleCb: (status: boolean) => void;
}

export const ESQLDataGridAccordion = ({
  isAccordionOpen,
  dataGridAttrs,
  query,
  isTableView,
  setIsAccordionOpen,
  onAccordionToggleCb,
}: ESQLDataGridAccordionProps) => {
  const onAccordionToggle = useCallback(
    (status: boolean) => {
      setIsAccordionOpen(!isAccordionOpen);
      onAccordionToggleCb(status);
    },
    [isAccordionOpen, onAccordionToggleCb, setIsAccordionOpen]
  );
  return (
    <EuiFlexItem
      grow={isAccordionOpen ? 1 : false}
      data-test-subj="ESQLQueryResults"
      css={css`
        .euiAccordion__childWrapper {
          flex: ${isAccordionOpen ? 1 : 'none'};
        }
        padding: 0 ${euiThemeVars.euiSize};
        border-bottom: ${euiThemeVars.euiBorderThin};
      `}
    >
      <EuiAccordion
        id="esql-results"
        css={css`
          .euiAccordion__children {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
        `}
        buttonContent={
          <EuiTitle
            size="xxs"
            css={css`
                padding: 2px;
              }
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
        extraAction={
          <EuiNotificationBadge size="m" color="subdued">
            {dataGridAttrs.rows.length}
          </EuiNotificationBadge>
        }
      >
        <>
          <ESQLDataGrid
            rows={dataGridAttrs?.rows}
            columns={dataGridAttrs?.columns}
            dataView={dataGridAttrs?.dataView}
            query={query}
            flyoutType="overlay"
            isTableView={isTableView}
            initialRowHeight={0}
            controlColumnIds={['openDetails']}
          />
          <EuiSpacer />
        </>
      </EuiAccordion>
    </EuiFlexItem>
  );
};

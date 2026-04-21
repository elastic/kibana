/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SEARCH_LIST_WIDTH } from './constants';

export const useListDetailPageStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      header: css`
        padding: ${euiTheme.size.l};
        flex-shrink: 0;
      `,
      body: css`
        flex: 1;
        overflow: hidden;
        padding: 0 ${euiTheme.size.l};
      `,
      searchColumn: css`
        width: ${SEARCH_LIST_WIDTH};
        display: flex;
        flex-direction: column;
        overflow: hidden;
      `,
      searchInputWrapper: css`
        padding: 0 ${euiTheme.size.m} ${euiTheme.size.s} 0;
        flex-shrink: 0;
      `,
      scrollableList: css`
        flex: 1;
        overflow-y: auto;
        padding: 0 ${euiTheme.size.m} ${euiTheme.size.s} 0;
      `,
      detailPanelWrapper: css`
        overflow: hidden;
        margin-bottom: ${euiTheme.size.m};
      `,
      noSelectionPlaceholder: css`
        height: 100%;
      `,
      loadingSpinner: css`
        padding: ${euiTheme.size.xxl};
      `,
    }),
    [euiTheme]
  );
};

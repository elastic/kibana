/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import { EuiSkeletonText, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { SourceData, SourceState } from '../data/data_layer';

interface DataStateProps {
  state: SourceState;
  onRetry: () => void;
  /** For a component that has something to say about no results itself, such as a template. */
  handlesEmpty?: boolean;
  children: (data: SourceData) => ReactNode;
}

/**
 * The loading, error and empty states shared by every node that shows source data, so they
 * look and behave the same everywhere.
 */
export const DataState = ({ state, onRetry, handlesEmpty = false, children }: DataStateProps) => {
  switch (state.status) {
    case 'loading':
      return <EuiSkeletonText lines={2} isLoading />;
    case 'error':
      return (
        <KbnDangerCallout
          announceOnMount={false}
          size="s"
          title={i18n.translate('xpack.customApp.dataState.errorTitle', {
            defaultMessage: 'Unable to load data',
          })}
          actionProps={{
            primary: {
              children: i18n.translate('xpack.customApp.dataState.retry', {
                defaultMessage: 'Retry',
              }),
              onClick: onRetry,
            },
          }}
        >
          <p>{state.message}</p>
        </KbnDangerCallout>
      );
    case 'success':
      return state.data.rows.length === 0 && !handlesEmpty ? (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.customApp.dataState.empty', {
              defaultMessage: 'No results found',
            })}
          </p>
        </EuiText>
      ) : (
        <>{children(state.data)}</>
      );
  }
};

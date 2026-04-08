/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { formatBytes } from '../stream_management/data_management/stream_detail_lifecycle/helpers/format_bytes';

export function StorageColumn({
  storageBytes,
  isLoading,
}: {
  storageBytes: number | undefined;
  isLoading: boolean;
}) {
  const { euiTheme } = useEuiTheme();

  if (isLoading) {
    return (
      <span
        className={css`
          display: flex;
          align-items: center;
          justify-content: flex-end;
          height: ${euiTheme.size.xl};
        `}
      >
        <EuiLoadingChart size="m" />
      </span>
    );
  }

  if (storageBytes === undefined) {
    return <span>{'\u2014'}</span>;
  }

  const formatted = formatBytes(storageBytes);

  return (
    <span
      aria-label={i18n.translate('xpack.streams.storageColumn.cellAriaLabel', {
        defaultMessage: '{size} storage used',
        values: { size: formatted },
      })}
    >
      {formatted}
    </span>
  );
}

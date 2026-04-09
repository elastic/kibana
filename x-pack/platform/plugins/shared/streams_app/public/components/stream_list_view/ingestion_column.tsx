/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiI18nNumber, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export function IngestionColumn({
  ingestionRate,
  isLoading,
}: {
  ingestionRate: number | undefined;
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

  if (ingestionRate === undefined) {
    return <span>{'\u2014'}</span>;
  }

  return (
    <span
      aria-label={i18n.translate('xpack.streams.ingestionColumn.cellAriaLabel', {
        defaultMessage: '{rate} documents per second',
        values: { rate: ingestionRate },
      })}
    >
      <FormattedMessage
        id="xpack.streams.ingestionColumn.cellValue"
        defaultMessage="{rate} docs/s"
        values={{ rate: <EuiI18nNumber value={ingestionRate} /> }}
      />
    </span>
  );
}

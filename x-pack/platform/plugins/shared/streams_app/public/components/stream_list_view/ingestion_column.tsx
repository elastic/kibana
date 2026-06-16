/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiI18nNumber, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface IngestionColumnProps {
  rate: number;
  isLoading: boolean;
}

export function IngestionColumn({ rate, isLoading }: IngestionColumnProps) {
  if (isLoading) return <EuiLoadingSpinner size="s" />;

  return (
    <FormattedMessage
      id="xpack.streams.ingestionColumn.cellValue"
      defaultMessage="{ingestionRate} docs/s"
      values={{ ingestionRate: <EuiI18nNumber value={rate} /> }}
    />
  );
}

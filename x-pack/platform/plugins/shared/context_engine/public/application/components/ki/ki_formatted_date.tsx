/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';
import React from 'react';

const parseIsoDate = (value: string): Date | undefined => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

interface KiFormattedDateProps {
  value: string;
  className?: string;
}

export const KiFormattedDate = ({ value, className }: KiFormattedDateProps) => {
  const date = parseIsoDate(value);
  if (!date) {
    return <span className={className}>{value}</span>;
  }

  return (
    <EuiToolTip
      content={
        <FormattedDate
          value={date}
          year="numeric"
          month="short"
          day="2-digit"
          hour="numeric"
          minute="numeric"
          second="numeric"
        />
      }
    >
      <span tabIndex={0} className={className}>
        <FormattedRelative value={date} />
      </span>
    </EuiToolTip>
  );
};

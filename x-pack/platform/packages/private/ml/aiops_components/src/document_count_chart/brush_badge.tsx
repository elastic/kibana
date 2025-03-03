/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiBadge, EuiText, EuiToolTip } from '@elastic/eui';
import { formatDate } from '@elastic/eui';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'HH:mm:ss';

interface BrushBadgeProps {
  label: string;
  marginLeft: number;
  timestampFrom: number;
  timestampTo: number;
  width: number;
}

/**
 * Badge component
 * @param label - label
 * @param marginLeft - margin left
 * @param timestampFrom - start timestamp
 * @param timestampTo - ending timestamp
 * @param width - width of badge
 * @constructor
 */
export const BrushBadge: FC<BrushBadgeProps> = ({
  label,
  marginLeft,
  timestampFrom,
  timestampTo,
  width,
}) => {
  // If "from" and "to" are on the same day, we skip displaying the date twice.
  const dateFrom = formatDate(timestampFrom, DATE_FORMAT);
  const dateTo = formatDate(timestampTo, DATE_FORMAT);
  const timeFrom = formatDate(timestampFrom, TIME_FORMAT);
  const timeTo = formatDate(timestampTo, TIME_FORMAT);

  return (
    <div
      css={{
        position: 'absolute',
        marginLeft: `${marginLeft}px`,
      }}
    >
      <EuiToolTip
        content={
          <EuiText size="xs">
            {dateFrom} {timeFrom} -{' '}
            {dateFrom !== dateTo && (
              <>
                <br />
                {dateTo}{' '}
              </>
            )}
            {timeTo}
          </EuiText>
        }
        position="top"
      >
        <EuiBadge css={{ width, textAlign: 'center' }}>{label}</EuiBadge>
      </EuiToolTip>
    </div>
  );
};

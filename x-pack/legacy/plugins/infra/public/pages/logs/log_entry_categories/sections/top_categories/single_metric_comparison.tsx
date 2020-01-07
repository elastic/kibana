/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiTextColor } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import React from 'react';

import euiStyled from '../../../../../../../../common/eui_styled_components';

export const SingleMetricComparison: React.FunctionComponent<{
  currentValue: number;
  previousValue: number;
}> = ({ currentValue, previousValue }) => {
  const changeFactor = currentValue / previousValue - 1;

  if (changeFactor < 0) {
    return (
      <NoWrapSpan>
        <EuiIcon type="sortDown" color="danger" />
        <EuiTextColor color="danger">{formatPercentage(changeFactor)}</EuiTextColor>
      </NoWrapSpan>
    );
  } else if (changeFactor > 0 && Number.isFinite(changeFactor)) {
    return (
      <NoWrapSpan>
        <EuiIcon type="sortUp" color="success" />
        <EuiTextColor color="secondary">{formatPercentage(changeFactor)}</EuiTextColor>
      </NoWrapSpan>
    );
  } else if (changeFactor > 0 && !Number.isFinite(changeFactor)) {
    return (
      <NoWrapSpan>
        <EuiIcon type="sortUp" color="success" />
        <EuiTextColor color="secondary">{newCategoryTrendLabel}</EuiTextColor>
      </NoWrapSpan>
    );
  }

  return null;
};

const formatPercentage = (value: number) => numeral(value).format('+0,0 %');

const newCategoryTrendLabel = i18n.translate(
  'xpack.infra.logs.logEntryCategories.newCategoryTrendLabel',
  {
    defaultMessage: 'new',
  }
);

const NoWrapSpan = euiStyled.span`
  white-space: nowrap;
`;

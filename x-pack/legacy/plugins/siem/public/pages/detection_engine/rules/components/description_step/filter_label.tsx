/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { esFilters } from '../../../../../../../../../../src/plugins/data/public';
import { existsOperator, isOneOfOperator } from './filter_operator';

interface Props {
  filter: esFilters.Filter;
  valueLabel?: string;
}

export const FilterLabel = memo<Props>(({ filter, valueLabel }) => {
  const prefixText = filter.meta.negate
    ? ` ${i18n.translate('xpack.siem.detectionEngine.createRule.filterLabel.negatedFilterPrefix', {
        defaultMessage: 'NOT ',
      })}`
    : '';
  const prefix =
    filter.meta.negate && !filter.meta.disabled ? (
      <EuiTextColor color="danger">{prefixText}</EuiTextColor>
    ) : (
      prefixText
    );

  if (filter.meta.alias !== null) {
    return (
      <>
        {prefix}
        {filter.meta.alias}
      </>
    );
  }

  switch (filter.meta.type) {
    case esFilters.FILTERS.EXISTS:
      return (
        <>
          {prefix}
          {`${filter.meta.key}: ${existsOperator.message}`}
        </>
      );
    case esFilters.FILTERS.GEO_BOUNDING_BOX:
      return (
        <>
          {prefix}
          {`${filter.meta.key}: ${valueLabel}`}
        </>
      );
    case esFilters.FILTERS.GEO_POLYGON:
      return (
        <>
          {prefix}
          {`${filter.meta.key}: ${valueLabel}`}
        </>
      );
    case esFilters.FILTERS.PHRASES:
      return (
        <>
          {prefix}
          {filter.meta.key} {isOneOfOperator.message} {valueLabel}
        </>
      );
    case esFilters.FILTERS.QUERY_STRING:
      return (
        <>
          {prefix}
          {valueLabel}
        </>
      );
    case esFilters.FILTERS.PHRASE:
    case esFilters.FILTERS.RANGE:
      return (
        <>
          {prefix}
          {`${filter.meta.key}: ${valueLabel}`}
        </>
      );
    default:
      return (
        <>
          {prefix}
          {JSON.stringify(filter.query)}
        </>
      );
  }
});

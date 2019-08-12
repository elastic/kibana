/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiBadge, EuiText } from '@elastic/eui';
import { idx } from '@kbn/elastic-idx';

import { getSelectableFields, EsDoc } from '../../../../common';

interface ExpandedRowProps {
  item: EsDoc;
}

export const ExpandedRow: React.SFC<ExpandedRowProps> = ({ item }) => {
  const keys = getSelectableFields([item]);
  const list = keys.map(k => {
    // split the attribute key string and use reduce with an idx check to access nested attributes.
    const value = k.split('.').reduce((obj, i) => idx(obj, _ => _[i]), item._source) || '';
    return (
      <span key={k}>
        <EuiBadge>{k}:</EuiBadge>
        <small> {typeof value === 'string' ? value : JSON.stringify(value)}&nbsp;&nbsp;</small>
      </span>
    );
  });
  return <EuiText>{list}</EuiText>;
};

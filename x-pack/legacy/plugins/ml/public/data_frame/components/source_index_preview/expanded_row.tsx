/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import React from 'react';

import { EuiBadge, EuiText } from '@elastic/eui';

import { EsDoc } from './common';

import { getSelectableFields } from './common';

interface ExpandedRowProps {
  item: EsDoc;
}

export const ExpandedRow: React.SFC<ExpandedRowProps> = ({ item }) => {
  const keys = getSelectableFields([item]);
  const list = keys.map(k => {
    const value = get(item._source, k, '');
    return (
      <span key={k}>
        <EuiBadge>{k}:</EuiBadge>
        <small> {value}&nbsp;&nbsp;</small>
      </span>
    );
  });
  return <EuiText>{list}</EuiText>;
};

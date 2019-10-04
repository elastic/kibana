/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { FieldsListItem } from './fields_list_item';
import { NormalizedField } from '../../../types';

interface Props {
  fields?: NormalizedField[];
  treeDepth?: number;
}

export const FieldsList = React.memo(({ fields = [], treeDepth = 0 }: Props) => {
  return (
    <ul>
      {fields.map(field => (
        <li key={field.id}>
          <FieldsListItem field={field} treeDepth={treeDepth} />
        </li>
      ))}
    </ul>
  );
});

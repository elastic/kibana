/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { FieldsListItemContainer } from './fields_list_item_container';
import { NormalizedField } from '../../../types';

interface Props {
  fields?: NormalizedField[];
  treeDepth?: number;
}

export const FieldsList = React.memo(function FieldsListComponent({ fields, treeDepth }: Props) {
  if (fields === undefined) {
    return null;
  }
  return (
    <ul className="mappingsEditor__fieldsList">
      {fields.map((field, index) => (
        <FieldsListItemContainer
          key={field.id}
          fieldId={field.id}
          treeDepth={treeDepth === undefined ? 0 : treeDepth}
          isLastItem={index === fields.length - 1}
        />
      ))}
    </ul>
  );
});

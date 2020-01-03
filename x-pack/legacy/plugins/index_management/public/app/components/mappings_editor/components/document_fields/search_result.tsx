/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { NormalizedField } from '../../types';
import { FieldsListItemFlat } from './fields/fields_list_item_flat';

interface Props {
  fields: NormalizedField[];
}

export const SearchResult = ({ fields }: Props) => {
  return (
    <ul className="mappingsEditor__fieldsList">
      {fields.map(field => (
        <FieldsListItemFlat
          key={field.id}
          field={field}
          areActionButtonsVisible={true}
          isDimmed={false}
          isHighlighted={false}
        />
      ))}
    </ul>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { sortBy } from 'lodash';
import { Tag } from '../components/tag';
import { getId } from './get_id';
import { tagsRegistry } from './tags_registry';

// EUI helper function
// generates the FieldValueSelectionFilter object for EuiSearchBar for tag filtering
export const getTagsFilter = (type: 'health' | 'badge') => {
  const uniqueTags = sortBy(Object.values(tagsRegistry.toJS()), 'name');

  return {
    type: 'field_value_selection',
    field: 'tag',
    name: 'Tags',
    multiSelect: true,
    options: uniqueTags.map(({ name, color }) => ({
      value: name,
      name,
      view: (
        <div>
          <Tag key={getId('tag')} color={color} name={name} type={type} />
        </div>
      ),
    })),
  };
};

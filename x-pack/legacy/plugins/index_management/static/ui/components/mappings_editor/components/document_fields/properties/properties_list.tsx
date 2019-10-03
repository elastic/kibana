/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { PropertiesListItem } from './properties_list_item';
import { NormalizedProperty } from '../../../types';

interface Props {
  properties?: NormalizedProperty[];
  path?: string;
  treeDepth?: number;
}

export const PropertiesList = React.memo(({ properties = [], treeDepth = 0, path = '' }: Props) => {
  return (
    <ul>
      {properties.map(property => (
        <li key={property.path}>
          <PropertiesListItem property={property} treeDepth={treeDepth} parentPath={path} />
        </li>
      ))}
    </ul>
  );
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { Property, IProperty } from './property';

export interface Props {
  defaultValue?: { [key: string]: Omit<IProperty, 'name'> };
}

export const Properties = ({ defaultValue = {} }: Props) => {
  const propertiesArray = Object.entries(defaultValue).map(([name, value]) => ({ name, ...value }));

  return (
    <ul>
      {propertiesArray.map(prop => (
        <li key={prop.name}>
          <Property value={prop} />
        </li>
      ))}
    </ul>
  );
};

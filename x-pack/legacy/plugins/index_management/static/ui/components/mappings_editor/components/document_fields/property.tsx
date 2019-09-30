/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

export interface IProperty {
  name: string;
  type: string;
}

interface Props {
  value: IProperty;
}

export const Property = ({ value }: Props) => {
  return (
    <div>
      <p>
        {value.name} | {value.type}
      </p>
    </div>
  );
};

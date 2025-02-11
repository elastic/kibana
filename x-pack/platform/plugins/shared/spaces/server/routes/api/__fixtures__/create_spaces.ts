/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function createSpaces() {
  return [
    {
      id: 'a-space',
      attributes: {
        name: 'a space',
        disabledFeatures: [],
      },
    },
    {
      id: 'b-space',
      attributes: {
        name: 'b space',
        disabledFeatures: [],
      },
    },
    {
      id: 'default',
      attributes: {
        name: 'Default Space',
        disabledFeatures: [],
        _reserved: true,
      },
    },
  ];
}

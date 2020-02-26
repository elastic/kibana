/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractLayer, ILayer } from './layer';

export function makeLayer(): ILayer {
  const a = new AbstractLayer(
    {
      id: 'foobar',
      sourceDescriptor: {
        id: 'barfoo',
        type: 'test',
      },
    },
    null
  );
  return a;
}

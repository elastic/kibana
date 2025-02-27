/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedMap } from './saved_map';

describe('savedMap', () => {
  const fn = savedMap().fn;
  const args = {
    id: 'some-id',
    center: null,
    title: null,
    timerange: null,
    hideLayer: [],
  };

  it('accepts null context', () => {
    const expression = fn(null, args, {} as any);

    expect(expression.input).toEqual({
      hiddenLayers: [],
      hideFilterActions: true,
      id: 'some-id',
      isLayerTOCOpen: false,
      mapCenter: undefined,
      savedObjectId: 'some-id',
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      title: undefined,
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Node } from '@xyflow/react';
import { getTranslateExtent } from './translate_extent';

describe('getTranslateExtent', () => {
  it('yields an undefined extent for an empty node list', () => {
    expect(getTranslateExtent([])).toBeUndefined();
  });

  it('yields a wider extent for a node offset to the x axis', () => {
    const nodes = [
      {
        position: { x: 0, y: 0 },
        measured: { width: 50, height: 20 },
      } as Node,
      {
        position: { x: 100, y: 0 },
        measured: { width: 50, height: 20 },
      } as Node,
    ];

    expect(getTranslateExtent(nodes)).toStrictEqual([
      [-500, -500],
      [650, 520],
    ]);
  });

  it('yields a taller extent for a node offset to the y axis', () => {
    const nodes = [
      {
        position: { x: 0, y: 0 },
        measured: { width: 50, height: 20 },
      } as Node,
      {
        position: { x: 0, y: 100 },
        measured: { width: 50, height: 20 },
      } as Node,
    ];

    expect(getTranslateExtent(nodes)).toStrictEqual([
      [-500, -500],
      [550, 620],
    ]);
  });
});

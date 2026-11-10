/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import type { HeatmapScene } from '@kbn/isomer';
import { compareCharts } from './compare';
import {
  normalizeDataGridReading,
  normalizeHeatmapDebugState,
  normalizePartitionDebugState,
  normalizeWordReadings,
} from './records';

const slice = (name: string | null, depth: number, value: number, color: string) => ({
  name,
  depth,
  value,
  color,
  coords: [0, 0] as [number, number],
});

describe('Gate A records', () => {
  it("reads an Isomer engine's slice keys as the values Kibana names slices by", () => {
    const kibana = normalizePartitionDebugState({
      partition: [
        {
          panelTitle: '',
          partitions: [slice('alpha', 2, 3, '#FF0000'), slice(null, 1, 5, '#00FF00')],
        },
      ],
    } as DebugState);
    const engine = normalizePartitionDebugState(
      {
        partition: [
          {
            panelTitle: '',
            partitions: [slice('\\null', 1, 5, '#00ff00'), slice('neg:alpha', 2, 3, '#ff0000')],
          },
        ],
      } as DebugState,
      { keyed: true }
    );
    expect(kibana.lists.slice).toEqual([
      { name: '(null)', depth: 1, value: 5, color: '#00ff00' },
      { name: 'alpha', depth: 2, value: 3, color: '#ff0000' },
    ]);
    expect(compareCharts(kibana, engine)).toEqual([]);
  });

  it("lists a waffle's squares once per slice", () => {
    const squares = Array.from({ length: 4 }, () => slice('alpha', 1, 4, '#ff0000'));
    const state = { partition: [{ panelTitle: '', partitions: squares }] } as DebugState;
    expect(normalizePartitionDebugState(state, { waffle: true }).lists.slice).toHaveLength(1);
    // Slices of other shapes can be equal.
    expect(normalizePartitionDebugState(state).lists.slice).toHaveLength(4);
  });

  it("places an engine's heat map cells by its Scene's categories", () => {
    const scene = {
      x: { scale: 'ordinal', categories: [{ x: 'a', label: 'a' }] },
      y: { scale: 'ordinal', categories: [{ x: 'k0', label: 'web-01' }] },
    } as unknown as HeatmapScene;
    const state = {
      heatmap: { cells: [{ datum: { x: 0, y: 0 }, value: 1, fill: 'red' }] },
    } as unknown as DebugState;
    expect(normalizeHeatmapDebugState(state, scene).lists.cell).toEqual([
      { x: 'a', y: 'web-01', value: 1, color: '#ff0000' },
    ]);
  });

  it("strips the data grid's hidden markers", () => {
    const { lists } = normalizeDataGridReading({
      headers: [{ text: 'Category\u21a6' }],
      cells: [{ row: 0, column: 0, text: 'alpha\u21b5', color: 'black', backgroundColor: '' }],
    });
    expect(lists.header).toEqual([{ text: 'Category' }]);
    expect(lists.cell[0].text).toBe('alpha');
  });

  it("leaves a tag cloud's caption out of its words", () => {
    const { lists } = normalizeWordReadings(
      [
        { text: 'red', fill: 'red' },
        { text: 'tags - count', fill: 'black' },
      ],
      ['tags - count']
    );
    expect(lists.word).toEqual([{ text: 'red', color: '#ff0000' }]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpecObject } from '../spec';

import type { CorpusSpec } from './types';

const vg = (name: string, spec: SpecObject, extra: Partial<CorpusSpec> = {}) => ({
  name: `Vega: ${name}`,
  mode: 'vega' as const,
  spec,
  ...extra,
});

const points = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: (i * 37) % 100,
  y: (i * 61) % 100,
  group: ['alpha', 'beta', 'gamma'][i % 3],
}));

const hierarchy = [
  { id: 'root' },
  { id: 'a', parent: 'root' },
  { id: 'b', parent: 'root' },
  { id: 'a1', parent: 'a', size: 4 },
  { id: 'a2', parent: 'a', size: 6 },
  { id: 'b1', parent: 'b', size: 3 },
  { id: 'b2', parent: 'b', size: 5 },
  { id: 'b3', parent: 'b', size: 2 },
];

const linear = (name: string, field: string, range: string) => ({
  name,
  type: 'linear',
  domain: { data: 'points', field },
  range,
});

const symbols = (from: string, encode: SpecObject = {}) => ({
  type: 'symbol',
  from: { data: from },
  encode: {
    update: {
      x: { field: 'x' },
      y: { field: 'y' },
      size: { value: 40 },
      fill: { value: '#6092C0' },
      ...encode,
    },
  },
});

export const vegaSpecs: CorpusSpec[] = [
  vg('scales, axes, symbol and gradient legends, title from a signal', {
    signals: [{ name: 'heading', value: 'Thirty points' }],
    title: { text: { signal: 'heading' } },
    data: [{ name: 'points', values: points }],
    scales: [
      linear('x', 'x', 'width'),
      linear('y', 'y', 'height'),
      {
        name: 'color',
        type: 'ordinal',
        domain: { data: 'points', field: 'group' },
        range: 'category',
      },
      {
        name: 'shade',
        type: 'linear',
        domain: { data: 'points', field: 'x' },
        range: 'ramp',
      },
    ],
    axes: [
      { orient: 'bottom', scale: 'x', grid: true },
      { orient: 'left', scale: 'y', grid: true },
    ],
    legends: [{ fill: 'color' }, { fill: 'shade', type: 'gradient' }],
    marks: [
      {
        type: 'symbol',
        from: { data: 'points' },
        encode: {
          update: {
            x: { scale: 'x', field: 'x' },
            y: { scale: 'y', field: 'y' },
            fill: { scale: 'color', field: 'group' },
            stroke: { scale: 'shade', field: 'x' },
          },
        },
      },
    ],
  }),
  vg('nested groups faceted from data', {
    data: [{ name: 'points', values: points }],
    scales: [
      {
        name: 'row',
        type: 'band',
        domain: { data: 'points', field: 'group' },
        range: 'height',
        padding: 0.1,
      },
      linear('x', 'x', 'width'),
    ],
    marks: [
      {
        type: 'group',
        from: { facet: { name: 'cell', data: 'points', groupby: 'group' } },
        encode: {
          update: {
            y: { scale: 'row', field: 'group' },
            height: { scale: 'row', band: 1 },
            width: { signal: 'width' },
            stroke: { value: '#ccc' },
          },
        },
        marks: [
          {
            type: 'rect',
            from: { data: 'cell' },
            encode: {
              update: {
                x: { scale: 'x', field: 'x' },
                width: { value: 3 },
                y: { value: 2 },
                y2: { field: { group: 'height' }, offset: -2 },
                fill: { value: '#54B399' },
              },
            },
          },
        ],
      },
    ],
  }),
  vg('sequence generator, formula, and text', {
    data: [
      {
        name: 'seq',
        transform: [
          { type: 'sequence', start: 0, stop: 12 },
          { type: 'formula', expr: 'datum.data * 30', as: 'angle' },
          { type: 'formula', expr: "'#' + datum.data", as: 'label' },
        ],
      },
    ],
    marks: [
      {
        type: 'text',
        from: { data: 'seq' },
        encode: {
          update: {
            x: { signal: 'width / 2 + cos(datum.angle * PI / 180) * 80' },
            y: { signal: 'height / 2 + sin(datum.angle * PI / 180) * 80' },
            text: { field: 'label' },
            align: { value: 'center' },
          },
        },
      },
    ],
  }),
  vg('streamgraph with a wiggle offset', {
    data: [
      {
        name: 'series',
        values: Array.from({ length: 36 }, (_, i) => ({
          t: i % 12,
          k: ['p', 'q', 'r'][Math.floor(i / 12)],
          v: 5 + ((i * 13) % 17),
        })),
        transform: [
          {
            type: 'stack',
            groupby: ['t'],
            sort: { field: 'k' },
            field: 'v',
            offset: 'wiggle',
          },
        ],
      },
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: { data: 'series', field: 't' },
        range: 'width',
      },
      {
        name: 'y',
        type: 'linear',
        domain: { data: 'series', field: 'y1' },
        range: 'height',
        nice: true,
      },
      {
        name: 'color',
        type: 'ordinal',
        domain: { data: 'series', field: 'k' },
        range: 'category',
      },
    ],
    marks: [
      {
        type: 'group',
        from: { facet: { name: 'one', data: 'series', groupby: 'k' } },
        marks: [
          {
            type: 'area',
            from: { data: 'one' },
            encode: {
              update: {
                x: { scale: 'x', field: 't' },
                y: { scale: 'y', field: 'y0' },
                y2: { scale: 'y', field: 'y1' },
                fill: { scale: 'color', field: 'k' },
                interpolate: { value: 'basis' },
              },
            },
          },
        ],
      },
    ],
  }),
  vg('tidy tree with links', {
    data: [
      {
        name: 'tree',
        values: hierarchy,
        transform: [
          { type: 'stratify', key: 'id', parentKey: 'parent' },
          {
            type: 'tree',
            method: 'tidy',
            size: [{ signal: 'width' }, { signal: 'height' }],
          },
        ],
      },
      {
        name: 'links',
        source: 'tree',
        transform: [{ type: 'treelinks' }, { type: 'linkpath', orient: 'vertical' }],
      },
    ],
    marks: [
      {
        type: 'path',
        from: { data: 'links' },
        encode: {
          update: { path: { field: 'path' }, stroke: { value: '#999' } },
        },
      },
      symbols('tree'),
    ],
  }),
  vg('treemap', {
    data: [
      {
        name: 'tree',
        values: hierarchy,
        transform: [
          { type: 'stratify', key: 'id', parentKey: 'parent' },
          {
            type: 'treemap',
            field: 'size',
            size: [{ signal: 'width' }, { signal: 'height' }],
          },
          { type: 'filter', expr: '!datum.children' },
        ],
      },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'tree' },
        encode: {
          update: {
            x: { field: 'x0' },
            x2: { field: 'x1' },
            y: { field: 'y0' },
            y2: { field: 'y1' },
            fill: { value: '#9170B8' },
            stroke: { value: 'white' },
          },
        },
      },
    ],
  }),
  vg('circle packing', {
    data: [
      {
        name: 'tree',
        values: hierarchy,
        transform: [
          { type: 'stratify', key: 'id', parentKey: 'parent' },
          {
            type: 'pack',
            field: 'size',
            size: [{ signal: 'width' }, { signal: 'height' }],
          },
        ],
      },
    ],
    marks: [
      symbols('tree', {
        size: { signal: '4 * datum.r * datum.r' },
        fillOpacity: { value: 0.3 },
      }),
    ],
  }),
  vg('static force layout', {
    data: [
      { name: 'nodes', values: points.slice(0, 10).map(({ id }) => ({ id })) },
      {
        name: 'links',
        values: Array.from({ length: 9 }, (_, i) => ({
          source: i,
          target: (i * 3 + 1) % 10,
        })),
      },
    ],
    marks: [
      {
        name: 'nodeMarks',
        type: 'symbol',
        from: { data: 'nodes' },
        encode: { enter: { size: { value: 60 }, fill: { value: '#D36086' } } },
        transform: [
          {
            type: 'force',
            static: true,
            iterations: 100,
            forces: [
              {
                force: 'center',
                x: { signal: 'width / 2' },
                y: { signal: 'height / 2' },
              },
              { force: 'collide', radius: 8 },
              { force: 'nbody', strength: -30 },
              { force: 'link', links: 'links', distance: 40 },
            ],
          },
        ],
      },
      {
        type: 'path',
        from: { data: 'links' },
        interactive: false,
        encode: { update: { stroke: { value: '#999' } } },
        transform: [
          {
            type: 'linkpath',
            shape: 'line',
            sourceX: 'datum.source.x',
            sourceY: 'datum.source.y',
            targetX: 'datum.target.x',
            targetY: 'datum.target.y',
          },
        ],
      },
    ],
  }),
  vg('voronoi cells', {
    data: [{ name: 'points', values: points }],
    scales: [linear('x', 'x', 'width'), linear('y', 'y', 'height')],
    marks: [
      {
        name: 'dots',
        type: 'symbol',
        from: { data: 'points' },
        encode: {
          update: {
            x: { scale: 'x', field: 'x' },
            y: { scale: 'y', field: 'y' },
          },
        },
      },
      {
        type: 'path',
        from: { data: 'dots' },
        encode: {
          update: { stroke: { value: '#ccc' }, strokeWidth: { value: 0.5 } },
        },
        transform: [
          {
            type: 'voronoi',
            x: 'datum.x',
            y: 'datum.y',
            size: [{ signal: 'width' }, { signal: 'height' }],
          },
        ],
      },
    ],
  }),
  vg('density contours', {
    data: [
      { name: 'points', values: points },
      {
        name: 'contours',
        source: 'points',
        transform: [
          {
            type: 'kde2d',
            size: [{ signal: 'width' }, { signal: 'height' }],
            x: { expr: "scale('x', datum.x)" },
            y: { expr: "scale('y', datum.y)" },
            as: 'grid',
          },
          { type: 'isocontour', field: 'grid', levels: 4 },
        ],
      },
    ],
    scales: [linear('x', 'x', 'width'), linear('y', 'y', 'height')],
    marks: [
      {
        type: 'shape',
        from: { data: 'contours' },
        encode: {
          update: { stroke: { value: '#6092C0' }, strokeWidth: { value: 1 } },
        },
        transform: [{ type: 'geoshape', field: 'datum.contour' }],
      },
    ],
  }),
  vg('graticule and sphere on an orthographic projection', {
    projections: [
      {
        name: 'projection',
        type: 'orthographic',
        scale: 90,
        rotate: [20, -30],
        translate: [{ signal: 'width / 2' }, { signal: 'height / 2' }],
      },
    ],
    data: [
      { name: 'sphere', values: [{ type: 'Sphere' }] },
      { name: 'graticule', transform: [{ type: 'graticule', step: [15, 15] }] },
    ],
    marks: [
      {
        type: 'shape',
        from: { data: 'sphere' },
        encode: { update: { fill: { value: '#e6f1fb' } } },
        transform: [{ type: 'geoshape', projection: 'projection' }],
      },
      {
        type: 'shape',
        from: { data: 'graticule' },
        encode: {
          update: { stroke: { value: '#999' }, strokeWidth: { value: 0.5 } },
        },
        transform: [{ type: 'geoshape', projection: 'projection' }],
      },
    ],
  }),
  vg('signals with event streams, in their default state', {
    signals: [
      {
        name: 'hovered',
        value: null,
        on: [
          { events: 'symbol:pointerover', update: 'datum' },
          { events: 'symbol:pointerout', update: 'null' },
        ],
      },
      {
        name: 'dragX',
        value: 50,
        on: [
          {
            events: '[pointerdown, window:pointerup] > window:pointermove',
            update: 'clamp(x(), 0, width)',
          },
        ],
      },
    ],
    data: [{ name: 'points', values: points }],
    scales: [linear('x', 'x', 'width'), linear('y', 'y', 'height')],
    marks: [
      {
        type: 'symbol',
        from: { data: 'points' },
        encode: {
          update: {
            x: { scale: 'x', field: 'x' },
            y: { scale: 'y', field: 'y' },
            fill: {
              signal: "hovered && hovered.id === datum.id ? '#E7664C' : '#6092C0'",
            },
          },
        },
      },
      {
        type: 'rule',
        encode: {
          update: {
            x: { signal: 'dragX' },
            y: { value: 0 },
            y2: { signal: 'height' },
          },
        },
      },
    ],
  }),
  vg('data inserted by a signal trigger as the view starts', {
    signals: [{ name: 'seed', value: { label: 'a much longer category name', v: 9 } }],
    data: [
      {
        name: 'rows',
        values: [{ label: 'short', v: 4 }],
        on: [{ trigger: 'seed', insert: 'seed' }],
      },
    ],
    scales: [
      {
        name: 'y',
        type: 'band',
        domain: { data: 'rows', field: 'label' },
        range: 'height',
        padding: 0.2,
      },
      {
        name: 'x',
        type: 'linear',
        domain: { data: 'rows', field: 'v' },
        range: 'width',
        nice: true,
      },
    ],
    axes: [
      { orient: 'left', scale: 'y' },
      { orient: 'bottom', scale: 'x' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'rows' },
        encode: {
          update: {
            y: { scale: 'y', field: 'label' },
            height: { scale: 'y', band: 1 },
            x: { scale: 'x', value: 0 },
            x2: { scale: 'x', field: 'v' },
            fill: { value: '#6092C0' },
          },
        },
      },
    ],
  }),
  vg('data inserted by a signal trigger that widens the value scale', {
    signals: [{ name: 'seed', value: { label: 'tiny', v: 9 } }],
    data: [
      {
        name: 'rows',
        values: [{ label: 'short', v: 4 }],
        on: [{ trigger: 'seed', insert: 'seed' }],
      },
    ],
    scales: [
      {
        name: 'y',
        type: 'band',
        domain: { data: 'rows', field: 'label' },
        range: 'height',
        padding: 0.2,
      },
      {
        name: 'x',
        type: 'linear',
        domain: { data: 'rows', field: 'v' },
        range: 'width',
        nice: true,
      },
    ],
    axes: [
      { orient: 'left', scale: 'y' },
      { orient: 'bottom', scale: 'x' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'rows' },
        encode: {
          update: {
            y: { scale: 'y', field: 'label' },
            height: { scale: 'y', band: 1 },
            x: { scale: 'x', value: 0 },
            x2: { scale: 'x', field: 'v' },
            fill: { value: '#6092C0' },
          },
        },
      },
    ],
  }),
  vg('data inserted by a signal trigger into a dataset no mark reads', {
    signals: [{ name: 'seed', value: { note: 'started' } }],
    data: [
      { name: 'log', values: [], on: [{ trigger: 'seed', insert: 'seed' }] },
      {
        name: 'rows',
        values: [
          { label: 'a much longer category name', v: 9 },
          { label: 'short', v: 4 },
        ],
      },
    ],
    scales: [
      {
        name: 'y',
        type: 'band',
        domain: { data: 'rows', field: 'label' },
        range: 'height',
        padding: 0.2,
      },
      {
        name: 'x',
        type: 'linear',
        domain: { data: 'rows', field: 'v' },
        range: 'width',
        nice: true,
      },
    ],
    axes: [
      { orient: 'left', scale: 'y' },
      { orient: 'bottom', scale: 'x' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'rows' },
        encode: {
          update: {
            y: { scale: 'y', field: 'label' },
            height: { scale: 'y', band: 1 },
            x: { scale: 'x', value: 0 },
            x2: { scale: 'x', field: 'v' },
            fill: { value: '#6092C0' },
          },
        },
      },
    ],
  }),
  vg(
    'random jitter',
    {
      data: [
        {
          name: 'points',
          values: points,
          transform: [{ type: 'formula', expr: 'random()', as: 'jitter' }],
        },
      ],
      scales: [linear('x', 'x', 'width')],
      marks: [
        symbols('points', {
          x: { scale: 'x', field: 'x' },
          y: { signal: 'datum.jitter * height' },
        }),
      ],
    },
    { random: true }
  ),

  // Need a canvas, which Node and Hermes lack.
  vg(
    'label transform',
    {
      data: [{ name: 'points', values: points }],
      scales: [linear('x', 'x', 'width'), linear('y', 'y', 'height')],
      marks: [
        {
          name: 'dots',
          type: 'symbol',
          from: { data: 'points' },
          encode: {
            update: {
              x: { scale: 'x', field: 'x' },
              y: { scale: 'y', field: 'y' },
            },
          },
        },
        {
          type: 'text',
          from: { data: 'dots' },
          encode: { enter: { text: { field: 'datum.group' } } },
          transform: [
            {
              type: 'label',
              size: [{ signal: 'width' }, { signal: 'height' }],
            },
          ],
        },
      ],
    },
    { fails: /getContext/ }
  ),
  vg(
    'word cloud',
    {
      data: [
        {
          name: 'words',
          values: ['vega', 'isomer', 'kibana', 'chart', 'render'].map((text, i) => ({
            text,
            size: 10 + i * 4,
          })),
        },
      ],
      marks: [
        {
          type: 'text',
          from: { data: 'words' },
          encode: { enter: { text: { field: 'text' } } },
          transform: [
            {
              type: 'wordcloud',
              size: [{ signal: 'width' }, { signal: 'height' }],
              text: { field: 'text' },
              fontSize: { field: 'datum.size' },
            },
          ],
        },
      ],
    },
    { fails: /height|getContext/ }
  ),
];

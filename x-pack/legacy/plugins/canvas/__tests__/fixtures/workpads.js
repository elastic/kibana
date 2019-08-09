/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const workpads = [
  {
    pages: [
      {
        elements: [
          {
            expression: `
            demodata |
            ply by=age fn={rowCount | as count} |
            staticColumn total value={math 'sum(count)'} |
            mapColumn percentage fn={math 'count/total * 100'} |
            sort age |
            pointseries x=age y=percentage |
            plot defaultStyle={seriesStyle points=0 lines=5}`,
          },
        ],
      },
    ],
  },
  {
    pages: [{ elements: [{ expression: 'filters | demodata | markdown "hello" | render' }] }],
  },
  {
    pages: [
      {
        elements: [
          { expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { expression: 'filters | demodata | markdown "hello" | render' },
          { expression: 'filters | demodata | pointseries | pie | render' },
        ],
      },
      { elements: [{ expression: 'filters | demodata | table | render' }] },
      { elements: [{ expression: 'image | render' }] },
      { elements: [{ expression: 'image | render' }] },
    ],
  },
  {
    pages: [
      {
        elements: [
          { expression: 'filters | demodata | markdown "hello" | render' },
          { expression: 'filters | demodata | markdown "hello" | render' },
          { expression: 'image | render' },
        ],
      },
      {
        elements: [
          { expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { expression: 'filters | demodata | markdown "hello" | render' },
          { expression: 'filters | demodata | pointseries | pie | render' },
          { expression: 'image | render' },
        ],
      },
      {
        elements: [
          { expression: 'filters | demodata | pointseries | pie | render' },
          {
            expression:
              'filters | demodata | pointseries | plot defaultStyle={seriesStyle points=0 lines=5} | render',
          },
        ],
      },
    ],
  },
  {
    pages: [
      {
        elements: [
          { expression: 'demodata | render as=debug' },
          { expression: 'filters | demodata | pointseries | plot | render' },
          { expression: 'filters | demodata | table | render' },
          { expression: 'filters | demodata | table | render' },
        ],
      },
      {
        elements: [
          { expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { expression: 'filters | demodata | pointseries | pie | render' },
          { expression: 'image | render' },
        ],
      },
      {
        elements: [
          { expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { expression: 'demodata | render as=debug' },
          { expression: 'shape "square" | render' },
        ],
      },
    ],
  },
  {
    pages: [
      {
        elements: [
          { expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { expression: 'filters | demodata | markdown "hello" | render' },
        ],
      },
      { elements: [{ expression: 'image | render' }] },
      { elements: [{ expression: 'image | render' }] },
      { elements: [{ expression: 'filters | demodata | table | render' }] },
    ],
  },
];

export const elements = [
  { expression: 'demodata | pointseries | getCell | repeatImage | render' },
  { expression: 'filters | demodata | markdown "hello" | render' },
  { expression: 'filters | demodata | pointseries | pie | render' },
  { expression: 'image | render' },
];

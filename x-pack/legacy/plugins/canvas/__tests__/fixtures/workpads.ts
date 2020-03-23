/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CanvasWorkpad, CanvasElement, CanvasPage } from '../../types';

const BaseWorkpad: CanvasWorkpad = {
  '@created': '2019-02-08T18:35:23.029Z',
  '@timestamp': '2019-02-08T18:35:23.029Z',
  assets: {
    'asset-ada763f1-295e-4188-8e08-b5bed9e006a1': {
      id: 'asset-ada763f1-295e-4188-8e08-b5bed9e006a1',
      '@created': '2018-01-17T19:13:09.185Z',
      type: 'dataurl',
      value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
    },
  },
  name: 'base workpad',
  id: 'base-workpad',
  width: 0,
  height: 0,
  css: '',
  page: 1,
  pages: [],
  colors: [],
  isWriteable: true,
};

const BasePage: CanvasPage = {
  id: 'base-page',
  style: { background: 'white' },
  transition: {},
  elements: [],
  groups: [],
};
const BaseElement: CanvasElement = {
  position: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    angle: 0,
    parent: null,
  },
  id: 'base-id',
  type: 'element',
  expression: 'render',
  filter: '',
};

export const workpads: CanvasWorkpad[] = [
  {
    ...BaseWorkpad,
    pages: [
      {
        ...BasePage,
        elements: [
          {
            ...BaseElement,
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
    ...BaseWorkpad,
    pages: [
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'filters | demodata | markdown "hello" | render' },
        ],
      },
    ],
  },
  {
    ...BaseWorkpad,
    pages: [
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { ...BaseElement, expression: 'filters | demodata | markdown "hello" | render' },
          { ...BaseElement, expression: 'filters | demodata | pointseries | pie | render' },
        ],
      },
      {
        ...BasePage,
        elements: [{ ...BaseElement, expression: 'filters | demodata | table | render' }],
      },
      { ...BasePage, elements: [{ ...BaseElement, expression: 'image | render' }] },
      { ...BasePage, elements: [{ ...BaseElement, expression: 'image | render' }] },
    ],
  },
  {
    ...BaseWorkpad,
    pages: [
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'filters | demodata | markdown "hello" | render' },
          { ...BaseElement, expression: 'filters | demodata | markdown "hello" | render' },
          { ...BaseElement, expression: 'image | render' },
        ],
      },
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { ...BaseElement, expression: 'filters | demodata | markdown "hello" | render' },
          { ...BaseElement, expression: 'filters | demodata | pointseries | pie | render' },
          { ...BaseElement, expression: 'image | render' },
        ],
      },
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'filters | demodata | pointseries | pie | render' },
          {
            ...BaseElement,
            expression:
              'filters | demodata | pointseries | plot defaultStyle={seriesStyle points=0 lines=5} | render',
          },
        ],
      },
    ],
  },
  {
    ...BaseWorkpad,
    pages: [
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'demodata | render as=debug' },
          { ...BaseElement, expression: 'filters | demodata | pointseries | plot | render' },
          { ...BaseElement, expression: 'filters | demodata | table | render' },
          { ...BaseElement, expression: 'filters | demodata | table | render' },
        ],
      },
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { ...BaseElement, expression: 'filters | demodata | pointseries | pie | render' },
          { ...BaseElement, expression: 'image | render' },
        ],
      },
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { ...BaseElement, expression: 'demodata | render as=debug' },
          { ...BaseElement, expression: 'shape "square" | render' },
        ],
      },
    ],
  },
  {
    ...BaseWorkpad,
    pages: [
      {
        ...BasePage,
        elements: [
          { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
          { ...BaseElement, expression: 'filters | demodata | markdown "hello" | render' },
        ],
      },
      { ...BasePage, elements: [{ ...BaseElement, expression: 'image | render' }] },
      { ...BasePage, elements: [{ ...BaseElement, expression: 'image | render' }] },
      {
        ...BasePage,
        elements: [{ ...BaseElement, expression: 'filters | demodata | table | render' }],
      },
    ],
  },
];

export const elements: CanvasElement[] = [
  { ...BaseElement, expression: 'demodata | pointseries | getCell | repeatImage | render' },
  { ...BaseElement, expression: 'filters | demodata | markdown "hello" | render' },
  { ...BaseElement, expression: 'filters | demodata | pointseries | pie | render' },
  { ...BaseElement, expression: 'image | render' },
];

export const workpadWithGroupAsElement: CanvasWorkpad = {
  ...BaseWorkpad,
  pages: [
    {
      ...BasePage,
      elements: [
        { ...BaseElement, expression: 'image | render' },
        { ...BaseElement, id: 'group-1234' },
      ],
    },
  ],
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CanvasWorkpad, CanvasElement, CanvasPage } from '../../types';

const BaseWorkpad: CanvasWorkpad = {
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

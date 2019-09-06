/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementPosition } from './elements';

export interface CanvasAsset {
  '@created': string;
  id: string;
  type: 'dataurl';
  value: string;
}

export interface CanvasElement {
  id: string;
  position: ElementPosition;
  type: 'element';
  expression: string;
  filter: string;
}

export interface CanvasPage {
  id: string;
  style: {
    background: string;
  };
  transition: {}; // Fix
  elements: CanvasElement[];
  groups: CanvasElement[][];
}

export interface CanvasWorkpad {
  '@created': string;
  '@timestamp': string;
  assets: { [id: string]: CanvasAsset };
  colors: string[];
  css: string;
  height: number;
  id: string;
  isWriteable: boolean;
  name: string;
  page: number;
  pages: CanvasPage[];
  width: number;
}

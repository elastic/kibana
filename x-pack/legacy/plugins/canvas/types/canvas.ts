/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElementPosition } from './elements';

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
  name: string;
  id: string;
  width: number;
  height: number;
  css: string;
  page: number;
  pages: CanvasPage[];
  colors: string[];
  isWriteable: boolean;
}

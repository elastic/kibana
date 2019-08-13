/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Unlinked Webpack Type
import ContainerStyle from 'types/interpreter';
import { PositionedElement } from './elements';

export interface CanvasWorkpad {
  css: string;
  id: string;
  name: string;
  width: number;
  height: number;
  page: number;
  colors: string[];
  isWritable: boolean;
  assets: any;
  '@timestamp': string;
  '@created': string;
  pages: CanvasPage[];
}

export interface CanvasPage {
  id: string;
  style: any;
  transitions: any[];
  groups: string[];
  elements: PositionedElement[];
}

export interface CanvasRenderable {
  error: string;
  state: 'ready' | 'error';
  value: {
    as: string;
    containerStyle: ContainerStyle;
    css: string;
    type: 'render';
    value: any;
  };
}

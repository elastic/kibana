/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Unlinked Webpack Type
import ContainerStyle from 'types/interpreter';
import { CanvasElement, CanvasPage, CanvasWorkpad } from '../types';

export interface CanvasRenderedElement extends CanvasElement {
  expressionRenderable: CanvasRenderable;
}

export interface CanvasRenderedPage extends CanvasPage {
  elements: CanvasRenderedElement[];
  groups: CanvasRenderedElement[][];
}

export interface CanvasRenderedWorkpad extends CanvasWorkpad {
  pages: CanvasRenderedPage[];
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

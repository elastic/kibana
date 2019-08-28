/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Unlinked Webpack Type
import ContainerStyle from 'types/interpreter';
import { CSSProperties } from 'react';
import { SavedObject, SavedObjectAttributes } from 'src/core/server';

import { CanvasElement, CanvasPage, CanvasWorkpad } from '../types';

/**
 * Represents a Canvas Element whose expression has been evaluated and now
 * exists in a transient, ready-to-render state.
 */
export interface CanvasRenderedElement extends CanvasElement {
  expressionRenderable: CanvasRenderable;
}

/**
 * Represents a Page within a Canvas Workpad that is made up of ready-to-
 * render Elements.
 */
export interface CanvasRenderedPage extends CanvasPage {
  elements: CanvasRenderedElement[];
  groups: CanvasRenderedElement[][];
}

/**
 * A Canvas Workpad made up of ready-to-render Elements.
 */
export interface CanvasRenderedWorkpad extends CanvasWorkpad {
  pages: CanvasRenderedPage[];
}

export type CanvasRenderedWorkpadSavedObject = SavedObject<
  CanvasRenderedWorkpad & SavedObjectAttributes
>;

/**
 * Represents the success/failure of the initial evaluation of a Canvas
 * Element, as well as the Function and CSS necessary to render the Element
 * upon a stage.
 */
export interface CanvasRenderable {
  error: string;
  state: 'ready' | 'error';
  value: {
    as: string;
    containerStyle: ContainerStyle;
    css: CSSProperties;
    type: 'render';
    value: any;
  };
}

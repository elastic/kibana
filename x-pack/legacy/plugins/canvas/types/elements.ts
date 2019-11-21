/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionAST } from 'src/plugins/expressions/common';
import { CanvasElement } from '.';

export interface ElementSpec {
  name: string;
  image: string;
  expression: string;
  displayName?: string;
  tags?: string[];
  help?: string;
  filter?: string;
  width?: number;
  height?: number;
}

export type ElementFactory = () => ElementSpec;

export interface CustomElement {
  /**
   * unique ID for the custom element
   */
  id: string;
  /**
   * name of the custom element
   */
  name: string;
  /**
   * name to be displayed from element picker
   */
  displayName: string;
  /**
   * description of the custom element
   */
  help?: string;
  /**
   * base 64 data URL string of the preview image
   */
  image?: string;
  /**
   * tags associated with the element
   */
  tags?: string[];
  /**
   * the element object stringified
   */
  content: string;
}

export interface ElementPosition {
  /**
   * distance from the left edge of the page
   */
  left: number;
  /**
   * distance from the top edge of the page
   * */
  top: number;
  /**
   * width of the element
   */
  width: number;
  /**
   * height of the element
   */
  height: number;
  /**
   * angle of rotation
   */
  angle: number;
  /**
   * the id of the parent of this element part of a group
   */
  parent: string | null;
}

export type PositionedElement = CanvasElement & { ast: ExpressionAST };

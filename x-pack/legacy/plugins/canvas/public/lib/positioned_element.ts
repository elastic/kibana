/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type ArgumentValue = null | string | number | boolean | Ast;

interface Function {
  type: 'function';
  /**
   * name of the function
   */
  function: string;
  /**
   * arguments passed into the function
   */
  arguments: { [argument: string]: ArgumentValue } | {};
}

interface Ast {
  type: 'expression';
  /**
   * array of functions in the expression
   */
  chain: Function[];
}

interface Position {
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

export interface PositionedElement {
  /**
   * a Canvas element used to populate config forms
   */
  id: string;
  /**
   * layout engine settings
   */
  position: Position;
  /**
   * Canvas expression used to generate the element
   */
  expression: string;
  /**
   * AST of the Canvas expression for the element
   */
  ast: Ast;
}

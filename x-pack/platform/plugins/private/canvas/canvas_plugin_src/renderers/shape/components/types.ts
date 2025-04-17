/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import { ShapeRendererConfig } from '..';

export interface ShapeComponentProps extends ShapeRendererConfig {
  onLoaded: IInterpreterRenderHandlers['done'];
  parentNode: HTMLElement;
}

export interface Dimensions {
  width: number;
  height: number;
}

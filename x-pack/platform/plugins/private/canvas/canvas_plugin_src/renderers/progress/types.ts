/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExpressionFunctionDefinition,
  ExpressionValueRender,
  Style,
} from '@kbn/expressions-plugin/common';

export {
  type ViewBoxParams,
  type SvgTextAttributes,
} from '../../../public/components/shape_drawer/types';

export type ProgressRendererConfig = ProgressOutput;

export interface NodeDimensions {
  width: number;
  height: number;
}

export enum Progress {
  GAUGE = 'gauge',
  HORIZONTAL_BAR = 'horizontalBar',
  HORIZONTAL_PILL = 'horizontalPill',
  SEMICIRCLE = 'semicircle',
  UNICORN = 'unicorn',
  VERTICAL_BAR = 'verticalBar',
  VERTICAL_PILL = 'verticalPill',
  WHEEL = 'wheel',
}

export interface ProgressArguments {
  barColor: string;
  barWeight: number;
  font: Style;
  label: boolean | string;
  max: number;
  shape: Progress;
  valueColor: string;
  valueWeight: number;
}

export type ProgressOutput = ProgressArguments & {
  value: number;
};

export type ExpressionProgressFunction = () => ExpressionFunctionDefinition<
  'progress',
  number,
  ProgressArguments,
  ExpressionValueRender<ProgressArguments>
>;

export const getAvailableProgressShapes = () => Object.values(Progress);

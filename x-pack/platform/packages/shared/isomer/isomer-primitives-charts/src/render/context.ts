/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/distillate';
import type { DefaultPackTypes, StyledRenderContext, SurfaceMap } from '@elastic/isomer-sdk';

import type { ColorMode } from '../theme/resolve';

/**
 * What a frame drawing charts must supply. A chart reads the mode from it under `snapshot`, the only
 * surface that resolves one; any richer host palette carrying `colorMode` satisfies it.
 */
export interface ChartsFrameTheme {
  colorMode: ColorMode;
}

export interface ChartPackTypes extends DefaultPackTypes {
  theme: ChartsFrameTheme;
  context: StyledRenderContext;
}

export type ChartReactEnv = SurfaceMap<ChartPackTypes>['react']['env'];

/** Resolves Distillate handles through the host adapter, or falls back to readable names. */
export const cls = (context: StyledRenderContext | undefined, ...handles: StyleHandle[]): string =>
  context?.resolveClassName
    ? context.resolveClassName(...handles)
    : handles.map(({ readableName }) => readableName).join(' ');

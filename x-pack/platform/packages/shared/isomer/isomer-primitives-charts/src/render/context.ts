/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/distillate';
import type { DefaultPackTypes, StyledRenderContext, SurfaceMap } from '@elastic/isomer-sdk';

export interface ChartPackTypes extends DefaultPackTypes {
  context: StyledRenderContext;
}

export type ChartReactEnv = SurfaceMap<ChartPackTypes>['react']['env'];

/** Resolves Distillate handles through the host adapter, or falls back to readable names. */
export const cls = (context: StyledRenderContext | undefined, ...handles: StyleHandle[]): string =>
  context?.resolveClassName
    ? context.resolveClassName(...handles)
    : handles.map(({ readableName }) => readableName).join(' ');

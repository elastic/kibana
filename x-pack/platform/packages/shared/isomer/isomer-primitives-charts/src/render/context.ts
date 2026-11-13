/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/distillate';
import type { DefaultPackTypes, StyledRenderContext, SurfaceMap } from '@elastic/isomer-sdk';

import { type BorealisTokenValues, borealisDark } from '@kbn/isomer-theme';

import type { ColorMode } from '../theme/resolve';

/**
 * The theme a frame drawing charts supplies: Kibana's runtime types every frame's theme as Borealis
 * token values, which carry no mode, so `colorModeOf` reads it from the values.
 */
export type ChartsFrameTheme = BorealisTokenValues;

/** `dark` when the frame's theme is Borealis dark, otherwise `light`. */
export const colorModeOf = (theme: ChartsFrameTheme): ColorMode =>
  theme === borealisDark || theme.color.background.plain === borealisDark.color.background.plain
    ? 'dark'
    : 'light';

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

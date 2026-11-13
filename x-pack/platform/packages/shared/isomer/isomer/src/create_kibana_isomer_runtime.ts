/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type {
  FrameMap,
  IsomerRuntime,
  IsomerRuntimeOptions,
  ReactRenderOptions,
  ReactSurface,
  SnapshotSurface,
} from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { i18n } from '@kbn/i18n';
import type { BorealisTokenValues } from '@kbn/isomer-theme';
import { createIsomerStyleContext, kibanaCardFrame } from '@kbn/isomer-theme';

/** `frames` replaces the default `card` frame, and `defaultFrame` names one of them. */
export type KibanaIsomerRuntimeOptions<THostContext = unknown> = Omit<
  IsomerRuntimeOptions<THostContext, StyledRenderContext, BorealisTokenValues>,
  'defaultAriaLabel'
>;

/** An Isomer runtime whose renderers resolve style handles through `resolveClassName`, and that always has a `snapshot` surface. */
export type KibanaIsomerRuntime<THostContext = unknown> = IsomerRuntime<
  THostContext,
  StyledRenderContext,
  BorealisTokenValues,
  SnapshotSurface
>;

const defaultFrames: FrameMap<BorealisTokenValues> = { card: kibanaCardFrame };

// The server renders React only to build HTML, which the `html` surface styles itself.
const documentStyleContext = (): StyledRenderContext =>
  typeof document === 'undefined' ? {} : createIsomerStyleContext();

const withStyleDefaults = (
  options?: ReactRenderOptions<StyledRenderContext>
): ReactRenderOptions<StyledRenderContext> => ({
  ...options,
  wrapper: options?.wrapper ?? true,
  context: { ...documentStyleContext(), ...options?.context },
});

const styledReactSurface = ({
  validating,
  render,
  renderNode,
}: ReactSurface<StyledRenderContext>): ReactSurface<StyledRenderContext> => ({
  validating,
  render: (composition, options) => render(composition, withStyleDefaults(options)),
  renderNode: (node, options) => renderNode(node, withStyleDefaults(options)),
});

/**
 * Creates an Isomer runtime with Kibana defaults. React renders are styled with no setup: they
 * wrap in the `.isomer` root and write the theme's CSS to the document. The `snapshot` surface
 * draws in `kibanaCardFrame` unless `frames` replaces it. Browser code must load it lazily,
 * because the runtime imports `react-dom/server`.
 */
export const createKibanaIsomerRuntime = <THostContext = unknown>({
  frames,
  defaultFrame,
  ...options
}: KibanaIsomerRuntimeOptions<THostContext>): KibanaIsomerRuntime<THostContext> => {
  const runtime = createIsomerRuntime<THostContext, StyledRenderContext, BorealisTokenValues>({
    ...options,
    ...(frames ? { frames, defaultFrame } : { frames: defaultFrames }),
    defaultAriaLabel: i18n.translate('xpack.isomer.defaultAriaLabel', {
      defaultMessage: 'Content',
    }),
  });
  return {
    ...runtime,
    surfaces: { ...runtime.surfaces, react: styledReactSurface(runtime.surfaces.react) },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type {
  IsomerRuntime,
  IsomerRuntimeOptions,
  ReactRenderOptions,
  ReactSurface,
} from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { i18n } from '@kbn/i18n';
import { createIsomerStyleContext } from '@kbn/isomer-theme';

export type KibanaIsomerRuntimeOptions<THostContext = unknown> = Omit<
  IsomerRuntimeOptions<THostContext, StyledRenderContext>,
  'defaultAriaLabel'
>;

/** An Isomer runtime whose renderers resolve style handles through `resolveClassName`. */
export type KibanaIsomerRuntime<THostContext = unknown> = IsomerRuntime<
  THostContext,
  StyledRenderContext
>;

// The server renders React only to build HTML, which the `html` surface styles itself.
const documentStyleContext = (): StyledRenderContext =>
  typeof document === 'undefined' ? {} : createIsomerStyleContext();

const withStyleDefaults = ({
  context,
  wrapper,
  ...options
}: ReactRenderOptions<StyledRenderContext> = {}): ReactRenderOptions<StyledRenderContext> => ({
  ...options,
  wrapper: wrapper ?? true,
  context: context?.resolveClassName ? context : { ...documentStyleContext(), ...context },
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
 * wrap in the `.isomer` root and write the theme's CSS to the document. Browser code must load
 * it lazily, because the runtime imports `react-dom/server`.
 */
export const createKibanaIsomerRuntime = <THostContext = unknown>(
  options: KibanaIsomerRuntimeOptions<THostContext>
): KibanaIsomerRuntime<THostContext> => {
  const runtime = createIsomerRuntime<THostContext, StyledRenderContext>({
    ...options,
    defaultAriaLabel: i18n.translate('xpack.isomer.defaultAriaLabel', {
      defaultMessage: 'Content',
    }),
  });
  return {
    ...runtime,
    surfaces: { ...runtime.surfaces, react: styledReactSurface(runtime.surfaces.react) },
  };
};

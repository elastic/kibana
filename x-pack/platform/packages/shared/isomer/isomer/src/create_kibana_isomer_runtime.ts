/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { IsomerRuntime, IsomerRuntimeOptions } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { i18n } from '@kbn/i18n';

export type KibanaIsomerRuntimeOptions<THostContext = unknown> = Omit<
  IsomerRuntimeOptions<THostContext, StyledRenderContext>,
  'defaultAriaLabel'
>;

/** An Isomer runtime whose renderers resolve style handles through `resolveClassName`. */
export type KibanaIsomerRuntime<THostContext = unknown> = IsomerRuntime<
  THostContext,
  StyledRenderContext
>;

/**
 * Creates an Isomer runtime with Kibana defaults. Browser code must load it lazily, because the
 * runtime imports `react-dom/server`.
 */
export const createKibanaIsomerRuntime = <THostContext = unknown>(
  options: KibanaIsomerRuntimeOptions<THostContext>
): KibanaIsomerRuntime<THostContext> =>
  createIsomerRuntime<THostContext, StyledRenderContext>({
    ...options,
    defaultAriaLabel: i18n.translate('xpack.isomer.defaultAriaLabel', {
      defaultMessage: 'Content',
    }),
  });

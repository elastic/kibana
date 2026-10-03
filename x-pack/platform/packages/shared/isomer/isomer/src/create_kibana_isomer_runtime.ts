/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { IsomerRuntime, IsomerRuntimeOptions } from '@elastic/isomer-runtime';
import { i18n } from '@kbn/i18n';

export type KibanaIsomerRuntimeOptions<THostContext = unknown> = Omit<
  IsomerRuntimeOptions<THostContext>,
  'defaultAriaLabel'
>;

/**
 * Creates an Isomer runtime with Kibana defaults. Browser code must load it lazily, because the
 * runtime imports `react-dom/server`.
 */
export const createKibanaIsomerRuntime = <THostContext = unknown>(
  options: KibanaIsomerRuntimeOptions<THostContext>
): IsomerRuntime<THostContext> =>
  createIsomerRuntime<THostContext>({
    ...options,
    defaultAriaLabel: i18n.translate('xpack.isomer.defaultAriaLabel', {
      defaultMessage: 'Content',
    }),
  });

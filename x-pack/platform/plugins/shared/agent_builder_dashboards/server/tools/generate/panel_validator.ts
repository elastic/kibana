/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { ValidatePanelContent } from '@kbn/dashboard-authoring';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';

type PanelSchema = ReturnType<DashboardPluginStart['getPanelSchema']>;

/**
 * Mirrors the `spec` of the native vega embeddable schema, which the vega plugin only registers
 * while `vega.standaloneEmbeddable` is enabled. Remove once that flag is on by default.
 */
const vegaConfigSchema = z.looseObject({
  spec: z.discriminatedUnion('format', [
    z.object({ format: z.literal('hjson'), value: z.string().min(1) }),
    z.object({ format: z.literal('json'), value: z.looseObject({}) }),
  ]),
});

/**
 * Checks new and edited panel content against the config schema the dashboard API registers for
 * its panel type, so generated panels stay valid as-code panels.
 */
export const createPanelValidator = (panelSchema: PanelSchema): ValidatePanelContent => {
  const configSchemaByType = new Map<string, z.ZodType>([
    [VEGA_VIS_TYPE, vegaConfigSchema],
    ...panelSchema.options.map(({ shape }): [string, z.ZodType] => [
      shape.type.value,
      shape.config,
    ]),
  ]);

  return ({ type, config }) => {
    const configSchema = configSchemaByType.get(type);
    if (!configSchema) {
      return `Panel type "${type}" is not supported by the dashboard API.`;
    }

    const result = configSchema.safeParse(config);
    return result.success
      ? undefined
      : `Invalid "${type}" panel config: ${z.prettifyError(result.error)}`;
  };
};

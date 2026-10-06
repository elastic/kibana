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
 * Checks new and edited panel content against the config schema the dashboard API registers for
 * its panel type, so generated panels stay valid as-code panels.
 */
export const createPanelValidator = (panelSchema: PanelSchema): ValidatePanelContent => {
  const configSchemaByType = new Map(
    panelSchema.options.map(({ shape }) => [shape.type.value, shape.config])
  );

  return ({ type, config }) => {
    // Generated Vega panels still store a raw spec string, which no registered schema accepts.
    if (type === VEGA_VIS_TYPE) {
      return undefined;
    }

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

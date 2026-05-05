/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const FLEET_INTEGRATION_INSTALLED_TRIGGER_ID = 'fleet.integrationInstalled' as const;

export const integrationInstalledEventSchema = z.object({
  package_name: z.string().describe('The name of the installed integration package.'),
  package_version: z.string().describe('The version of the installed integration package.'),
  install_source: z
    .enum(['registry', 'upload', 'bundled', 'custom'])
    .describe('The source from which the package was installed.'),
});

export type IntegrationInstalledEvent = z.infer<typeof integrationInstalledEventSchema>;

export const integrationInstalledTriggerDefinition: CommonTriggerDefinition = {
  id: FLEET_INTEGRATION_INSTALLED_TRIGGER_ID,
  eventSchema: integrationInstalledEventSchema,
};

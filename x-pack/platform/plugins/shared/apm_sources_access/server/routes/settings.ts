/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CustomRequestHandlerContext,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { getApmIndicesSavedObject } from '../saved_objects/apm_indices';
import type { ApmSourcesAccessPlugin } from '../plugin';
import type { APMIndices } from '..';

export interface APMSourcesRouteHandlerResources {
  request: KibanaRequest;
  context: CustomRequestHandlerContext<{}>;
  params: {
    query: {
      _inspect: boolean;
    };
  };
  logger: Logger;
  plugin: ReturnType<ApmSourcesAccessPlugin['setup']>;
  core: APMSourcesCore;
  kibanaVersion: string;
}

export interface APMSourcesCore {
  setup: CoreSetup;
}

export interface ApmIndexSettingsResponse {
  apmIndexSettings: Array<{
    configurationName: keyof APMIndices;
    defaultValue: string; // value defined in kibana[.dev].yml
    savedValue: string | undefined;
  }>;
}

export async function getApmIndices({
  plugin,
  context,
}: APMSourcesRouteHandlerResources): Promise<APMIndices> {
  const coreContext = await context.core;

  return await plugin.getApmIndices(coreContext.savedObjects.client);
}

export async function getApmIndexSettings({
  plugin,
  context,
}: APMSourcesRouteHandlerResources): Promise<ApmIndexSettingsResponse> {
  const { apmIndicesFromConfigFile } = plugin;

  const coreContext = await context.core;
  const apmIndicesSavedObject = await getApmIndicesSavedObject(coreContext.savedObjects.client);

  const apmIndicesConfigFile = Object.entries(apmIndicesFromConfigFile) as Array<
    [keyof typeof apmIndicesFromConfigFile, string]
  >;

  return {
    apmIndexSettings: apmIndicesConfigFile.map(([configurationName, defaultValue]) => ({
      configurationName,
      defaultValue, // value defined in kibana[.dev].yml
      savedValue: apmIndicesSavedObject?.[configurationName], // value saved via Saved Objects service
    })),
  };
}

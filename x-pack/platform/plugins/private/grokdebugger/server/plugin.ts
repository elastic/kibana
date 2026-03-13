/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin as KibanaPlugin } from '@kbn/core/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { ILicense } from '@kbn/licensing-types';
import { KibanaFramework } from './lib/kibana_framework';
import { registerGrokdebuggerRoutes } from './routes/api/grokdebugger';

export const config = {
  schema: schema.object({
    enabled: offeringBasedSchema({
      serverless: schema.boolean({ defaultValue: true }),
    }),
  }),
};

interface GrokdebuggerServerPluginDependencies {
  licensing: LicensingPluginSetup;
}

export class Plugin implements KibanaPlugin<void, void, GrokdebuggerServerPluginDependencies> {
  setup(coreSetup: CoreSetup, plugins: GrokdebuggerServerPluginDependencies) {
    const framework = new KibanaFramework(coreSetup);

    plugins.licensing.license$.subscribe((license: ILicense) => {
      framework.setLicense(license);
    });

    registerGrokdebuggerRoutes(framework);
  }

  start() {}
  stop() {}
}

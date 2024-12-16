/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema } from '@kbn/config-schema';
import { KibanaFramework } from './lib/kibana_framework';
import { registerGrokdebuggerRoutes } from './routes/api/grokdebugger';

export const config = {
  schema: schema.object({
    enabled: offeringBasedSchema({
      serverless: schema.boolean({ defaultValue: true }),
    }),
  }),
};

export class Plugin {
  setup(coreSetup, plugins) {
    const framework = new KibanaFramework(coreSetup);

    plugins.licensing.license$.subscribe((license) => {
      framework.setLicense(license);
    });

    registerGrokdebuggerRoutes(framework);
  }

  start() {}
  stop() {}
}

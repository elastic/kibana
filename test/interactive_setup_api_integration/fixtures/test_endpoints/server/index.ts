/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import path from 'path';

import type { PluginInitializer, PrebootPlugin } from 'kibana/server';

export const plugin: PluginInitializer<void, never> = (initializerContext): PrebootPlugin => ({
  setup: (core) => {
    core.http.registerRoutes('', (router) => {
      router.get(
        {
          path: '/test_endpoints/verification_code',
          validate: false,
          options: { authRequired: false },
        },
        async (context, request, response) => {
          // [HACK]: On CI tests are run from the different directories than the built and running Kibana instance. That
          // means Kibana from a Directory A is running with the test plugins from a Directory B. The problem is that
          // the data path that interactive setup plugin uses to store verification code is determined by the
          // `__dirname` that depends on the physical location of the file where it's used. This is the reason why we
          // end up with different data paths in Kibana built-in and test plugins. To workaround that we use Kibana
          // `process.cwd()` to construct data path manually.
          const verificationCodePath = path.join(process.cwd(), 'data', 'verification_code');
          initializerContext.logger.get().info(`Will read code from ${verificationCodePath}`);
          return response.ok({
            body: {
              verificationCode: (await fs.readFile(verificationCodePath)).toString(),
            },
          });
        }
      );
    });
  },
  stop: () => {},
});

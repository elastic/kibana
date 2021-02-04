/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup } from 'kibana/server';

import { schema } from '@kbn/config-schema';

export class RenderingPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.http.resources.register(
      {
        path: '/render/{id}',
        validate: {
          query: schema.object(
            {
              includeUserSettings: schema.boolean({ defaultValue: true }),
            },
            { unknowns: 'allow' }
          ),
          params: schema.object({
            id: schema.maybe(schema.string()),
          }),
        },
      },
      async (context, req, res) => {
        const { includeUserSettings } = req.query;

        if (includeUserSettings) {
          return res.renderCoreApp();
        }
        return res.renderAnonymousCoreApp();
      }
    );
  }

  public start() {}

  public stop() {}
}

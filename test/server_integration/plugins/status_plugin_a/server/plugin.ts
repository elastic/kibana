/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Subject } from 'rxjs';
import { Plugin, CoreSetup, ServiceStatus, ServiceStatusLevels } from '@kbn/core/server';

export class StatusPluginAPlugin implements Plugin {
  private status$ = new Subject<ServiceStatus>();

  public setup(core: CoreSetup, deps: {}) {
    // Set a custom status that will not emit immediately to force a timeout
    core.status.set(this.status$);

    const router = core.http.createRouter();

    router.post(
      {
        path: '/internal/status_plugin_a/status/set',
        validate: {
          query: schema.object({
            level: schema.oneOf([
              schema.literal('available'),
              schema.literal('degraded'),
              schema.literal('unavailable'),
              schema.literal('critical'),
            ]),
          }),
        },
      },
      (context, req, res) => {
        const { level } = req.query;

        this.status$.next({
          level: ServiceStatusLevels[level],
          summary: `statusPluginA is ${level}`,
        });

        return res.ok();
      }
    );
  }

  public start() {}
  public stop() {}
}

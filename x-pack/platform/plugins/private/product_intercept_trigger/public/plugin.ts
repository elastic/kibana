/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

export class ProductInterceptPublicPlugin implements Plugin {
  public setup(core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart) {
    core.http
      .get<{ triggerIntervalInMs: number; runs: number }>(
        '/internal/product_intercept/trigger_info'
      )
      .then((response) => {
        if (typeof response.runs !== 'undefined') {
          core.userProfile.getUserProfile$().subscribe((userProfile) => {
            // Ideally we should check if the user feedback prompt engaged with the last feedback
            // the approach will be to check if on user profile the trigger run counts matches the user's profile,
            // in the eventuality that it does, we trigger a feedback session and bump the user's profile run count.
            // with the approach the user will only be prompted once per cycle and per device.

            let interceptId;

            setInterval(() => {
              interceptId = core.notifications.productIntercepts.add({
                title: 'hello',
                // ideally this will come from a predefined place, so it's configurable
                steps: [
                  {
                    title: `hello (${response.runs})`,
                    subtitle: 'hello',
                    content: 'hello',
                  },
                  {
                    title: `world (${response.runs})`,
                    subtitle: 'World',
                    content: 'World',
                  },
                ],
                onFinish() {
                  // maybe bump user profile run count and close the dialog
                },
              });
            }, response.triggerIntervalInMs);
          });
        }
      })
      .catch((error) => {
        // log error
      });
  }

  public stop() {}
}

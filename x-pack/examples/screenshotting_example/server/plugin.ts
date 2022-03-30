/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, Plugin } from 'src/core/server';
import type { ScreenshottingStart } from '../../../plugins/screenshotting/server';
import { API_ENDPOINT, ScreenshottingExpressionResponse } from '../common';

interface StartDeps {
  screenshotting: ScreenshottingStart;
}

export class ScreenshottingExamplePlugin implements Plugin<void, void> {
  setup({ http, getStartServices }: CoreSetup<StartDeps>) {
    const router = http.createRouter();

    router.get(
      {
        path: API_ENDPOINT,
        validate: {
          query: schema.object({
            expression: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const [, { screenshotting }] = await getStartServices();
        const { metrics, results } = await screenshotting
          .getScreenshots({
            request,
            expression: request.query.expression,
          })
          .toPromise();

        return response.ok({
          body: JSON.stringify({
            metrics,
            image: results[0]?.screenshots[0]?.data.toString('base64'),
            errors: results[0]?.renderErrors,
          } as ScreenshottingExpressionResponse),
        });
      }
    );
  }

  start() {}
}

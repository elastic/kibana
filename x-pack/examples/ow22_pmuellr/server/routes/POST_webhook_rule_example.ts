/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Logger, IRouter } from 'kibana/server';

const routeValidation = {
  query: schema.object({
    duration: schema.number({ defaultValue: 5 }),
    // microseconds, v8 default is 1000
    interval: schema.number({ defaultValue: 1000 }),
  }),
};

const routeConfig = {
  path: '/_dev/webhook_rule_example',
  validate: routeValidation,
};

export function registerRoute(logger: Logger, router: IRouter): void {
  router.get(routeConfig, async (context, request, response) => {
    // const { duration, interval } = request.query;

    return response.ok({
      body: {},
    });
  });
}

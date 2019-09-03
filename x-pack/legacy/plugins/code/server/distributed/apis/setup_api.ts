/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceHandlerFor } from '../service_definition';

export const SetupDefinition = {
  setup: {
    request: {},
    response: {} as string,
  },
};

export const setupServiceHandler: ServiceHandlerFor<typeof SetupDefinition> = {
  async setup() {
    return 'ok';
  },
};

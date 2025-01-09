/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import { tryPollutingPrototypes } from '../common/pollute';

export class HardeningPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    core.http.createRouter().get(
      {
        path: '/api/hardening/_pollute_prototypes',
        validate: false,
      },
      async (context, request, response) => {
        const result = tryPollutingPrototypes();
        return response.ok({ body: result });
      }
    );
  }

  public start() {}
  public stop() {}
}

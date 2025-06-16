/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { TRIGGER_USER_INTERACTION_METADATA_API_ROUTE } from '../../../common/constants';

/**
 * @description provides utils to read and update information about the last interaction with a given intercept trigger.
 */
export class UserInterceptRunPersistenceService {
  start(http: CoreStart['http']) {
    return {
      getUserTriggerData$: this.userInterceptRunId.bind(this, http),
      updateUserTriggerData: this.persistInterceptRunInteraction.bind(this, http),
    };
  }

  userInterceptRunId(http: CoreStart['http'], triggerId: string) {
    return Rx.from(
      http.get<{ lastInteractedInterceptId: number }>(
        TRIGGER_USER_INTERACTION_METADATA_API_ROUTE.replace('{triggerId}', triggerId)
      )
    );
  }

  persistInterceptRunInteraction(http: CoreStart['http'], triggerId: string, runId: number) {
    return http.post(
      TRIGGER_USER_INTERACTION_METADATA_API_ROUTE.replace('{triggerId}', triggerId),
      {
        body: JSON.stringify({
          lastInteractedInterceptId: runId,
        }),
      }
    );
  }
}

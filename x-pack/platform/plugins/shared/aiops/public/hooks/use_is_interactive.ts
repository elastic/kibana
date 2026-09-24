/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { apiHasDisableTriggers, useStateFromPublishingSubject } from '@kbn/presentation-publishing';

export function useIsInteractive(parentApi: unknown): boolean {
  return !useStateFromPublishingSubject(
    apiHasDisableTriggers(parentApi) ? parentApi.disableTriggers$ : new BehaviorSubject(false)
  );
}

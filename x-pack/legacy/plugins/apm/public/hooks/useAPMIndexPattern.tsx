/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getAPMIndexPattern,
  ISavedObject
} from '../services/rest/savedObjects';
import { useFetcher } from './useFetcher';

export function useAPMIndexPattern() {
  const { data: apmIndexPattern = {} as ISavedObject, status } = useFetcher(
    getAPMIndexPattern,
    []
  );

  return { apmIndexPattern, status };
}

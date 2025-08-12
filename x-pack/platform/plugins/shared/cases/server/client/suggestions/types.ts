/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SuggestionOwner, SuggestionContext } from '../../../common/types/domain';

export interface GetAllForOwnersArgs {
  /**
   * The suggestion owners to retrieve suggestions for
   */
  owners: SuggestionOwner[];
  context: SuggestionContext;
  request: KibanaRequest;
}

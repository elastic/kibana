/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { LegacyRequest } from '../../../../../src/core/server';

export interface ServerFacade {
  config: Legacy.Server['config'];
  plugins: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: any; // We have to do this at the moment because the types are not compatible
    alerting?: Legacy.Server['plugins']['alerting'];
    savedObjects: Legacy.Server['savedObjects']['SavedObjectsClient'];
  };
  route: Legacy.Server['route'];
}

export type RequestFacade = LegacyRequest;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export { LegacyRequest } from '../../../../../src/core/server';

export interface LegacyServices {
  alerting?: Legacy.Server['plugins']['alerting'];
  config: Legacy.Server['config'];
  route: Legacy.Server['route'];
}

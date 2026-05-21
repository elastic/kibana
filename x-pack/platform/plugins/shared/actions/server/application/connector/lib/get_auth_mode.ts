/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthMode } from '@kbn/connector-specs';
import type { Connector } from '../types';

export function getAuthMode(authMode: Connector['authMode'] | undefined): AuthMode {
  return authMode ?? 'shared';
}

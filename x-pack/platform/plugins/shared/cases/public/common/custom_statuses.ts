/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from './lib/kibana';

/** Whether admins can define the statuses cases move through in each space. */
export const isCustomStatusesEnabled = (): boolean =>
  KibanaServices.getConfig()?.customStatuses?.enabled === true;

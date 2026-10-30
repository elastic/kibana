/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from './lib/kibana';

/** Whether Cases runs as the single top-level app at `/app/cases` with the `casesV4` feature. */
export const isTopLevelAppEnabled = (): boolean =>
  KibanaServices.getConfig()?.topLevelApp?.enabled === true;

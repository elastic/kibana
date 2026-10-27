/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateDataSourceAuthenticationMode } from '../create_data_source_flyout/create_data_source_flyout_authentication';

export interface AuthOption {
  value: CreateDataSourceAuthenticationMode;
  text: string;
  description: string;
  recommended?: boolean;
}

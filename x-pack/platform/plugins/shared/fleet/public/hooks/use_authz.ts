/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useStartServices } from './use_core';

// Expose authz object, containing the privileges for Fleet and Integrations
export function useAuthz() {
  const core = useStartServices();
  return core.authz;
}

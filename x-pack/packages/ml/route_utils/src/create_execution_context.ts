/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';

export function createExecutionContext(
  coreStart: CoreStart,
  name: string,
  id?: string,
  type = 'application'
) {
  const labels = coreStart.executionContext.getAsLabels();
  const page = labels.page as string;
  return {
    type,
    name,
    id: id ?? page,
    page,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

/**
 * Creates an execution context to be passed on as part of ES queries.
 * This allows you to identify the source triggering a request when debugging slow logs.
 *
 * @param coreStart Kibana CoreStart
 * @param name Context name, usually the plugin id
 * @param id Optional context id, can be used to override the default usage of page as id
 * @param type Optional context type, defaults to `application`.
 * @returns
 */
export function createExecutionContext(
  coreStart: CoreStart,
  name: string,
  id?: string,
  type = 'application'
): KibanaExecutionContext {
  const labels = coreStart.executionContext.getAsLabels();
  const page = labels.page as string;
  return {
    type,
    name,
    id: id ?? page,
    page,
  };
}

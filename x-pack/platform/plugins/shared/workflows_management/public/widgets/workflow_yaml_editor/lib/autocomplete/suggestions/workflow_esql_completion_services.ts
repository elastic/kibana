/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLCallbacks } from '@kbn/esql-types';

/** Services needed to call `suggest` from `@kbn/esql-language` inside the workflow YAML editor. */
export interface WorkflowEsqlCompletionServices {
  callbacks: ESQLCallbacks;
}

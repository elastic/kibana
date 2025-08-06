/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* common type for the suggestion item payload, shared between server and client
 * in order to support rendering UI components with predictable props
 * Could also use a runtime type check library like io-ts or zod for
 * further validation */
export interface SyntheticsMonitorSuggestion {
  id: string;
  name: string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We must have this in a separate file and it needs to be deep imported from
 * here, otherwise we run into problems exposing `@kbn/config-schema` to client code.
 */
export const SWIMLANE_TYPE = {
  OVERALL: 'overall',
  VIEW_BY: 'viewBy',
} as const;

export type SwimlaneType = (typeof SWIMLANE_TYPE)[keyof typeof SWIMLANE_TYPE];

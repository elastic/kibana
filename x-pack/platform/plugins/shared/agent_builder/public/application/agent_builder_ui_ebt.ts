/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable `data-ebt-element` values for Agent Builder UI click telemetry.
 * Prefer granular ids on interactive controls; these roots ensure every in-app click can resolve an element.
 */
export const AGENT_BUILDER_UI_EBT_ELEMENT = {
  APP_ROOT: 'agentBuilder.app',
  PAGE_CONTENT: 'agentBuilder.pageContent',
} as const;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable `data-ebt-*` wire values for `agent_builder_ui_click` / `ReportUiClickParams`.
 */
const ebtElement = {
  appRoot: 'agentBuilder.app',
  pageContent: 'agentBuilder.pageContent',
} as const;

const ebtAction = {} as const;
const ebtEntity = {} as const;
const ebtFormat = {} as const;

export const AGENT_BUILDER_UI_EBT = {
  element: ebtElement,
  action: ebtAction,
  entity: ebtEntity,
  format: ebtFormat,
} as const;

export type AgentBuilderUiEbt = typeof AGENT_BUILDER_UI_EBT;

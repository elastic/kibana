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
  SIDEBAR: 'agentBuilder.sidebar',
} as const;

const ebtAction = {
  navSidebar: {
    SIDEBAR_LAYER_TRANSITION: 'sidebar_layer_transition',
    SIDEBAR_NAVIGATION_CLICK: 'sidebar_navigation_click',
    AGENT_SWITCH: 'agent_switch',
    AGENT_SELECTOR_OPEN: 'agent_selector_open',
    MANAGE_ALL_AGENTS_CLICK: 'manage_all_agents_click',
  },
  conversationList: {
    CONVERSATION_START: 'conversation_start',
    CONVERSATION_RESUME: 'conversation_resume',
    CONVERSATION_SEARCH: 'conversation_search',
  },
} as const;

const ebtDetail = {
  layerTransition: {
    MANAGE_CLICK: 'manage_click',
    BACK_CLICK: 'back_click',
  },
} as const;

const ebtEntity = {} as const;
const ebtFormat = {} as const;

export const AGENT_BUILDER_UI_EBT = {
  element: ebtElement,
  action: ebtAction,
  detail: ebtDetail,
  entity: ebtEntity,
  format: ebtFormat,
} as const;

export type AgentBuilderUiEbt = typeof AGENT_BUILDER_UI_EBT;

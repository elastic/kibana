/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable `data-ebt-*` strings for `agent_builder_ui_click`. Values are analytics contracts.
 * Instrument targets handled by `agent_builder_ui_click_resolve.ts` (buttons, links, …).
 */

// `data-ebt-element`
export const AGENT_BUILDER_UI_EBT_ELEMENT = {
  APP_ROOT: 'agentBuilder.app',
  PAGE_CONTENT: 'agentBuilder.pageContent',
  CUSTOMIZE_SKILLS: 'agentBuilder.layer2.customize.skills',
  CUSTOMIZE_TOOLS: 'agentBuilder.layer2.customize.tools',
  CUSTOMIZE_PLUGINS: 'agentBuilder.layer2.customize.plugins',
  LIBRARY_SKILLS: 'agentBuilder.library.skills',
  LIBRARY_TOOLS: 'agentBuilder.library.tools',
  LIBRARY_PLUGINS: 'agentBuilder.library.plugins',
  SIDEBAR: 'agentBuilder.sidebar',
  CONVERSATION: 'agentBuilder.conversation',
  MANAGE_GLOBAL: 'agentBuilder.layer3.manage',
  INAPP_CHAT: 'agentBuilder.inappChat',
} as const;

// `data-ebt-detail` helpers
export const AGENT_BUILDER_UI_EBT_ENTITY_TYPE = {
  SKILL: 'skill',
  PLUGIN: 'plugin',
  TOOL: 'tool',
  CONNECTOR: 'connector',
} as const;

export const AGENT_BUILDER_UI_EBT_VIEW_FORMAT = {
  FLYOUT: 'flyout',
  SPLIT: 'split',
  PAGE: 'page',
} as const;

export const AGENT_BUILDER_UI_EBT_SIDEBAR_NAV_ITEM = {
  INSTRUCTIONS: 'instructions',
  SKILLS: 'skills',
  PLUGINS: 'plugins',
  CONNECTORS: 'connectors',
  ADVANCED: 'advanced',
  AGENTS: 'agents',
  TOOLS: 'tools',
} as const;

export type AgentBuilderUiEbtSidebarNavItem =
  (typeof AGENT_BUILDER_UI_EBT_SIDEBAR_NAV_ITEM)[keyof typeof AGENT_BUILDER_UI_EBT_SIDEBAR_NAV_ITEM];

/** Non-nav sidebar controls (toggle width, condensed shortcuts, …). */
export const AGENT_BUILDER_UI_EBT_SIDEBAR_CHROME_DETAIL = {
  TOGGLE_WIDTH: 'sidebar_toggle_width',
  NEW_CONVERSATION_CONDENSED: 'new_conversation_condensed',
  NEW_AGENT_FROM_SELECTOR: 'new_agent_from_selector',
  MANAGE_AGENTS_FROM_SELECTOR: 'manage_agents_from_selector',
} as const;

export const AGENT_BUILDER_UI_EBT_LAYER_TRANSITION_TRIGGER = {
  CUSTOMIZE_CLICK: 'customize_click',
  MANAGE_CLICK: 'manage_click',
  BACK_CLICK: 'back_click',
} as const;

// `data-ebt-action`
export const AGENT_BUILDER_UI_EBT_NAV_SIDEBAR_ACTION = {
  SIDEBAR_LAYER_TRANSITION: 'sidebar_layer_transition',
  SIDEBAR_NAVIGATION_CLICK: 'sidebar_navigation_click',
  AGENT_SWITCH: 'agent_switch',
  MANAGE_ALL_AGENTS_CLICK: 'manage_all_agents_click',
} as const;

export const AGENT_BUILDER_UI_EBT_CONVERSATION_ACTION = {
  CONVERSATION_START: 'conversation_start',
  CONVERSATION_RESUME: 'conversation_resume',
  CONVERSATION_SEARCH: 'conversation_search',
} as const;

export const AGENT_BUILDER_UI_EBT_LAYER2_CRUD_ACTION = {
  ENTITY_ADD_FROM_LIBRARY: 'entity_add_from_library',
  ENTITY_CREATE_NEW: 'entity_create_new',
  ENTITY_REMOVE: 'entity_remove',
  ENTITY_DETAIL_VIEW: 'entity_detail_view',
  ENTITY_EDIT_FROM_AGENT: 'entity_edit_from_agent',
} as const;

export const AGENT_BUILDER_UI_EBT_MANAGE_GLOBAL_ACTION = {
  MANAGE_ENTITY_LIST_VIEW: 'manage_entity_list_view',
  MANAGE_ENTITY_EDIT: 'manage_entity_edit',
  USED_BY_WARNING_SHOWN: 'used_by_warning_shown',
  USED_BY_WARNING_PROCEEDED: 'used_by_warning_proceeded',
  MANAGE_ENTITY_DELETE: 'manage_entity_delete',
} as const;

export const AGENT_BUILDER_UI_EBT_INAPP_ACTION = {
  INAPP_CHAT_OPEN: 'inapp_chat_open',
  INAPP_AGENT_SWITCH: 'inapp_agent_switch',
  INAPP_OPEN_FULLSCREEN: 'inapp_open_fullscreen',
  FULLSCREEN_ENTRY_POINT: 'fullscreen_entry_point',
} as const;

export const AGENT_BUILDER_UI_EBT_ROUTE_HEALTH_ACTION = {
  LEGACY_REDIRECT: 'legacy_redirect',
  ROUTE_NOT_FOUND: 'route_not_found',
  PERMISSION_DENIED: 'permission_denied',
} as const;

export const AGENT_BUILDER_UI_EBT_RUNTIME_ACTION = {
  SKILL_INVOKED: 'skill_invoked',
  SKILL_INVOCATION_COUNT: 'skill_invocation_count',
  PLUGIN_IMPORTED: 'plugin_imported',
} as const;

/** Fallbacks when no catalog action fits; prefer epic-aligned maps above. */
export const AGENT_BUILDER_UI_EBT_UI_CHROME_ACTION = {
  MANAGE_LIBRARY_LINK: 'manage_library_link',
  OPEN_ADD_MENU: 'open_add_menu',
  CROSS_NAVIGATE: 'cross_navigate',
  INSTALL_FROM_URL_OR_ZIP: 'install_from_url_or_zip',
} as const;

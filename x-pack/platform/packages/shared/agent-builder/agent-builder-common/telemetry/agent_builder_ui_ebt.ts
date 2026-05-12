/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable `data-ebt-*` wire strings for `agent_builder_ui_click` (`ReportUiClickParams`).
 * Resolved from the DOM by `agent_builder_ui_click_resolve.ts`.
 *
 * Import **`AGENT_BUILDER_UI_EBT`** only. String values are analytics keywords — **do not rename**.
 *
 * | DOM / usage | Tree |
 * | --- | --- |
 * | `data-ebt-element` | `element.*` (`agentBuilder.…`) |
 * | `data-ebt-action` | `action.*` (by UI domain) |
 * | `data-ebt-detail` (entity typing) | `entity.*` |
 * | `data-ebt-detail` / route `ebtNavItem` | `detail.*` |
 * | _reserved_ | `format` |
 */

export const AGENT_BUILDER_UI_EBT = {
  // `data-ebt-element`
  element: {
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
    ACCESS_PROMPT: 'agentBuilder.access.prompt',
  },

  // `data-ebt-action`
  action: {
    navSidebar: {
      SIDEBAR_LAYER_TRANSITION: 'sidebar_layer_transition',
      SIDEBAR_NAVIGATION_CLICK: 'sidebar_navigation_click',
      AGENT_SWITCH: 'agent_switch',
      MANAGE_ALL_AGENTS_CLICK: 'manage_all_agents_click',
    },
    conversation: {
      CONVERSATION_START: 'conversation_start',
      CONVERSATION_RESUME: 'conversation_resume',
      CONVERSATION_SEARCH: 'conversation_search',
    },
    layer2Crud: {
      ENTITY_ADD_FROM_LIBRARY: 'entity_add_from_library',
      ENTITY_CREATE_NEW: 'entity_create_new',
      ENTITY_REMOVE: 'entity_remove',
      ENTITY_DETAIL_VIEW: 'entity_detail_view',
      ENTITY_EDIT_FROM_AGENT: 'entity_edit_from_agent',
    },
    manageGlobal: {
      MANAGE_ENTITY_LIST_VIEW: 'manage_entity_list_view',
      MANAGE_ENTITY_EDIT: 'manage_entity_edit',
      USED_BY_WARNING_SHOWN: 'used_by_warning_shown',
      USED_BY_WARNING_PROCEEDED: 'used_by_warning_proceeded',
      MANAGE_ENTITY_DELETE: 'manage_entity_delete',
    },
    inapp: {
      INAPP_CHAT_OPEN: 'inapp_chat_open',
      INAPP_AGENT_SWITCH: 'inapp_agent_switch',
      INAPP_OPEN_FULLSCREEN: 'inapp_open_fullscreen',
      FULLSCREEN_ENTRY_POINT: 'fullscreen_entry_point',
    },
    access: {
      CONNECT_LLM: 'access_connect_llm',
      OPEN_EXTERNAL_DOCS: 'access_open_external_docs',
      OPEN_AGENT_BUILDER_DOCS: 'access_open_agent_builder_docs',
      UPGRADE_SUBSCRIPTION: 'access_upgrade_subscription',
      MANAGE_LICENSE: 'access_manage_license',
    },
    /** Library / cross-nav / install entry points when no finer-grained action applies */
    uiChrome: {
      MANAGE_LIBRARY_LINK: 'manage_library_link',
      OPEN_ADD_MENU: 'open_add_menu',
      CROSS_NAVIGATE: 'cross_navigate',
      INSTALL_FROM_URL_OR_ZIP: 'install_from_url_or_zip',
    },
  },

  // `data-ebt-detail` — entity typing
  entity: {
    SKILL: 'skill',
    PLUGIN: 'plugin',
    TOOL: 'tool',
    CONNECTOR: 'connector',
  },

  // `data-ebt-detail` / route metadata (`ebtNavItem`, …)
  detail: {
    sidebarChrome: {
      TOGGLE_WIDTH: 'sidebar_toggle_width',
      NEW_CONVERSATION_CONDENSED: 'new_conversation_condensed',
      NEW_AGENT_FROM_SELECTOR: 'new_agent_from_selector',
      MANAGE_AGENTS_FROM_SELECTOR: 'manage_agents_from_selector',
    },
    layerTransition: {
      CUSTOMIZE_CLICK: 'customize_click',
      MANAGE_CLICK: 'manage_click',
      BACK_CLICK: 'back_click',
    },
    sidebarNavItem: {
      INSTRUCTIONS: 'instructions',
      SKILLS: 'skills',
      PLUGINS: 'plugins',
      CONNECTORS: 'connectors',
      ADVANCED: 'advanced',
      AGENTS: 'agents',
      TOOLS: 'tools',
    },
  },

  format: {} as const,
} as const;

export type AgentBuilderUiEbt = typeof AGENT_BUILDER_UI_EBT;

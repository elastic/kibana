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
  flyout: 'agentBuilder.flyout',
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
  agentCustomization: {
    ENTITY_ADD_FROM_LIBRARY: 'entity_add_from_library',
    ENTITY_CREATE_NEW: 'entity_create_new',
    ENTITY_REMOVE: 'entity_remove',
    ENTITY_DETAIL_VIEW: 'entity_detail_view',
    ENTITY_EDIT_FROM_AGENT: 'entity_edit_from_agent',
  },
  globalManagement: {
    MANAGE_ENTITY_EDIT: 'manage_entity_edit',
    MANAGE_ENTITY_DELETE: 'manage_entity_delete',
  },
  inappChat: {
    OPEN_FULLSCREEN: 'inapp_open_fullscreen',
    AGENT_SWITCH: 'inapp_agent_switch',
  },
  agentList: {
    AGENT_CREATE: 'agent_create',
    AGENT_EDIT: 'agent_edit',
    AGENT_DELETE: 'agent_delete',
    LEARN_MORE_DOCS: 'learn_more_docs',
  },
  agentOverview: {
    COPY_ID: 'copy_agent_id',
    EDIT_DETAILS: 'edit_agent_details',
    DOCS_LINK: 'docs_link',
    DESCRIPTION_TOGGLE: 'description_toggle',
    ELASTIC_CAPABILITIES_TOGGLE: 'elastic_capabilities_toggle',
    EDIT_FLYOUT_SAVE: 'form_save',
    EDIT_FLYOUT_CANCEL: 'form_cancel',
  },
  agentEdit: {
    SAVE: 'form_save',
    SAVE_AND_CHAT: 'save_and_chat',
    CHAT: 'agent_chat',
    CANCEL: 'form_cancel',
    CLONE: 'agent_clone',
    DELETE: 'agent_delete',
    OPEN_MENU: 'open_menu',
    BACK_TO_LIST: 'back_to_list',
    LEARN_MORE_DOCS: 'learn_more_docs',
    MANAGE_ALL: 'manage_all',
    TOOLS_LINK: 'tools_link',
    SHOW_ACTIVE_ONLY: 'show_active_only',
  },
  access: {
    CONNECT_LLM: 'connect_llm',
    LEARN_MORE_DOCS: 'learn_more_docs',
    SUBSCRIPTION_PLANS: 'subscription_plans',
    MANAGE_LICENSE: 'manage_license',
  },
  conversation: {
    START_NEW: 'start_new',
    CLOSE: 'close',
    OPEN_TITLE_MENU: 'open_title_menu',
    RENAME: 'rename',
    DELETE: 'delete',
    RENAME_SAVE: 'rename_save',
    RENAME_CANCEL: 'rename_cancel',
    OPEN_MORE_ACTIONS: 'open_more_actions',
    AGENT_DETAILS: 'agent_details',
    GENAI_SETTINGS: 'genai_settings',
    ADD_TO_DATASET: 'add_to_dataset',
    SUBMIT: 'submit',
    CANCEL: 'cancel',
    OPEN_CONNECTOR_SELECTOR: 'open_connector_selector',
    MANAGE_CONNECTORS: 'manage_connectors',
    COPY_RESPONSE: 'copy_response',
    REGENERATE: 'regenerate',
    THINKING_TOGGLE: 'thinking_toggle',
    VIEW_JSON: 'view_json',
    VIEW_TRACE: 'view_trace',
    ROUND_ADD_TO_DATASET: 'round_add_to_dataset',
    RETRY: 'retry',
    STALE_USE_UPDATED: 'stale_use_updated',
    STALE_DISMISS: 'stale_dismiss',
    SCROLL_DOWN: 'scroll_down',
    OPEN_EMBEDDABLE_MENU: 'open_embeddable_menu',
    NEW_CHAT: 'new_chat',
    SWITCH_TO_AGENTS: 'switch_to_agents',
    BACK_TO_CONVERSATIONS: 'back_to_conversations',
    EMBEDDABLE_AGENT_DETAILS: 'embeddable_agent_details',
    REMOVE_ATTACHMENT: 'remove_attachment',
    ATTACHMENT_CLOSE: 'attachment_close',
    CONFIRM_PROMPT_CONFIRM: 'confirm_prompt_confirm',
    CONFIRM_PROMPT_CANCEL: 'confirm_prompt_cancel',
  },
  libraryPanel: {
    MANAGE_ALL: 'manage_all',
    VIEW_IN_LIBRARY: 'view_in_library',
    SORT_FILTER_OPEN: 'library_sort_filter_open',
    SORT_ASC: 'sort_asc',
    SORT_DESC: 'sort_desc',
    FILTER_ALL: 'filter_all',
    FILTER_ACTIVE: 'filter_active',
    FILTER_ELASTIC: 'filter_elastic',
    FILTER_CUSTOM: 'filter_custom',
    EMPTY_STATE_OPEN_LIBRARY: 'empty_state_open_library',
    EMPTY_STATE_MANAGE_ALL: 'empty_state_manage_all',
    CROSS_NAV_LINK: 'cross_nav_link',
    FLYOUT_SAVE: 'form_save',
    FLYOUT_CANCEL: 'form_cancel',
    SKILL_TOOL_CLICK: 'skill_tool_click',
    INSTALL_PLUGIN_TAB: 'install_plugin_tab',
    INSTALL_PLUGIN_SUBMIT: 'install_plugin_submit',
    LEARN_MORE_DOCS: 'learn_more_docs',
  },
} as const;

const ebtDetail = {
  layerTransition: {
    MANAGE_CLICK: 'manage_click',
    BACK_CLICK: 'back_click',
  },
} as const;

const ebtEntity = {
  TOOL: 'tool',
  PLUGIN: 'plugin',
  SKILL: 'skill',
  AGENT: 'agent',
} as const;
const ebtFormat = {} as const;

export const AGENT_BUILDER_UI_EBT = {
  element: ebtElement,
  action: ebtAction,
  detail: ebtDetail,
  entity: ebtEntity,
  format: ebtFormat,
} as const;

export type AgentBuilderUiEbt = typeof AGENT_BUILDER_UI_EBT;

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
    CONVERSATION_HEADER: 'agentBuilder.conversation.header',
    CONVERSATION_TITLE: 'agentBuilder.conversation.title',
    CONVERSATION_EMBEDDABLE_HEADER: 'agentBuilder.conversation.embeddableHeader',
    CONVERSATION_INPUT: 'agentBuilder.conversation.input',
    CONVERSATION_ROUNDS: 'agentBuilder.conversation.rounds',
    CONVERSATION_ROUND_THINKING: 'agentBuilder.conversation.round.thinking',
    CONVERSATION_ROUND_RESPONSE: 'agentBuilder.conversation.round.response',
    CONVERSATION_ROUND_PROMPT: 'agentBuilder.conversation.round.prompt',
    CONVERSATION_LIST: 'agentBuilder.conversation.list',
    CONVERSATION_SEARCH_MODAL: 'agentBuilder.conversation.searchModal',
    CONVERSATION_SCROLL: 'agentBuilder.conversation.scroll',
    CONVERSATION_STALE_ATTACHMENTS: 'agentBuilder.conversation.staleAttachments',
    MANAGE_GLOBAL: 'agentBuilder.layer3.manage',
    MANAGE_TOOLS: 'agentBuilder.manage.tools',
    MANAGE_TOOLS_TABLE: 'agentBuilder.manage.tools.table',
    MANAGE_TOOLS_FORM: 'agentBuilder.manage.tools.form',
    MANAGE_TOOLS_BULK_IMPORT: 'agentBuilder.manage.tools.bulkImportMcp',
    MANAGE_TOOLS_TEST_FLYOUT: 'agentBuilder.manage.tools.testFlyout',
    MANAGE_TOOLS_ESQL_VISUALIZATION: 'agentBuilder.manage.tools.esqlVisualization',
    MANAGE_AGENT_OVERVIEW: 'agentBuilder.manage.agent.overview',
    MANAGE_AGENT_FORM: 'agentBuilder.manage.agent.form',
    MANAGE_AGENT_EDIT_DETAILS: 'agentBuilder.manage.agent.editDetailsFlyout',
    MANAGE_AGENTS: 'agentBuilder.manage.agents',
    MANAGE_AGENTS_TABLE: 'agentBuilder.manage.agents.table',
    MANAGE_SKILLS: 'agentBuilder.manage.skills',
    MANAGE_SKILLS_TABLE: 'agentBuilder.manage.skills.table',
    MANAGE_SKILLS_AGENT_FLYOUT: 'agentBuilder.manage.skills.agentFlyout',
    MANAGE_PLUGINS: 'agentBuilder.manage.plugins',
    MANAGE_PLUGINS_TABLE: 'agentBuilder.manage.plugins.table',
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
      TITLE_POPOVER_OPEN: 'conversation_title_popover_open',
      TITLE_RENAME_OPEN: 'conversation_title_rename_open',
      TITLE_DELETE_OPEN: 'conversation_title_delete_open',
      RENAME_SUBMIT: 'conversation_rename_submit',
      RENAME_CANCEL: 'conversation_rename_cancel',
      DELETE_CONFIRM: 'conversation_delete_confirm',
      DELETE_CANCEL: 'conversation_delete_cancel',
      MORE_ACTIONS_OPEN: 'conversation_more_actions_open',
      MORE_AGENT_DETAILS: 'conversation_more_agent_details',
      MORE_GENAI_SETTINGS: 'conversation_more_genai_settings',
      MORE_FULL_SCREEN: 'conversation_more_full_screen',
      MORE_EXTERNAL_NEW_TAB: 'conversation_more_external_new_tab',
      MORE_ADD_TO_DATASET: 'conversation_more_add_to_dataset',
      SEARCH_MODAL_OPEN: 'conversation_search_modal_open',
      SEARCH_RESULT_SELECT: 'conversation_search_result_select',
      LIST_ITEM_SELECT: 'conversation_list_item_select',
      SCROLL_TO_LATEST: 'conversation_scroll_to_latest',
      MESSAGE_SUBMIT: 'conversation_message_submit',
      MESSAGE_CANCEL: 'conversation_message_cancel',
      CONNECTOR_SELECTOR_OPEN: 'conversation_connector_selector_open',
      CONNECTOR_SELECT: 'conversation_connector_select',
      INPUT_POPOVER_OPEN: 'conversation_input_popover_open',
      COMMAND_MENU_OPEN: 'conversation_command_menu_open',
      CONFIRMATION_ACCEPT: 'conversation_confirmation_accept',
      CONFIRMATION_REJECT: 'conversation_confirmation_reject',
      RESPONSE_COPY: 'conversation_response_copy',
      RESPONSE_REGENERATE: 'conversation_response_regenerate',
      RESPONSE_FEEDBACK_POSITIVE: 'conversation_response_feedback_positive',
      RESPONSE_FEEDBACK_NEGATIVE: 'conversation_response_feedback_negative',
      ATTACHMENT_OPEN: 'conversation_attachment_open',
      ATTACHMENT_DOWNLOAD: 'conversation_attachment_download',
      EXTERNAL_LINK_OPEN: 'conversation_external_link_open',
      ROUND_ERROR_RETRY: 'conversation_round_error_retry',
      ROUND_ERROR_DISMISS: 'conversation_round_error_dismiss',
      THINKING_STEP_TOGGLE: 'conversation_thinking_step_toggle',
      THINKING_TOOL_DETAIL: 'conversation_thinking_tool_detail',
      THINKING_RAW_JSON_OPEN: 'conversation_thinking_raw_json_open',
      THINKING_TRACE_OPEN: 'conversation_thinking_trace_open',
      THINKING_ADD_TO_DATASET: 'conversation_thinking_add_to_dataset',
      EMBEDDABLE_POPOVER_BACK: 'conversation_embeddable_popover_back',
      SUBAGENT_NAVIGATE: 'conversation_subagent_navigate',
      BACKGROUND_EXECUTION_ACTION: 'conversation_background_execution_action',
      ESQL_RESULTS_ACTION: 'conversation_esql_results_action',
      EMBEDDABLE_MENU_OPEN: 'conversation_embeddable_menu_open',
      EMBEDDABLE_CLOSE: 'conversation_embeddable_close',
      EMBEDDABLE_AGENTS_OPEN: 'conversation_embeddable_agents_open',
      EMBEDDABLE_CONVERSATIONS_OPEN: 'conversation_embeddable_conversations_open',
      STALE_ATTACHMENT_DISMISS: 'conversation_stale_attachment_dismiss',
      STALE_ATTACHMENT_RETRY: 'conversation_stale_attachment_retry',
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
    /** Global tools library, MCP connection entry points, tool form, bulk import */
    manageTools: {
      NEW_TOOL_ESQL: 'manage_tools_new_tool_esql',
      NAV_AGENTS: 'manage_tools_nav_agents',
      DOCS_LEARN_MORE_TOOLS: 'manage_tools_docs_learn_more_tools',
      DOCS_LEARN_MORE_CREATE: 'manage_tools_docs_learn_more_create',
      MCP_MENU_OPEN: 'manage_tools_mcp_menu_open',
      MCP_COPY_SERVER_URL: 'manage_tools_mcp_copy_server_url',
      MCP_NAV_BULK_IMPORT: 'manage_tools_mcp_nav_bulk_import',
      MCP_NAV_CLIENTS: 'manage_tools_mcp_nav_clients',
      MCP_DOCS_EXTERNAL: 'manage_tools_mcp_docs_external',
      TABLE_CONTEXT_OPEN: 'manage_tools_table_context_open',
      TABLE_ROW_EDIT: 'manage_tools_table_row_edit',
      TABLE_ROW_DELETE: 'manage_tools_table_row_delete',
      TABLE_CONTEXT_EDIT: 'manage_tools_table_context_edit',
      TABLE_CONTEXT_DELETE: 'manage_tools_table_context_delete',
      TABLE_CONTEXT_TEST: 'manage_tools_table_context_test',
      TABLE_CONTEXT_CLONE: 'manage_tools_table_context_clone',
      TABLE_CONTEXT_VIEW: 'manage_tools_table_context_view',
      TABLE_ROW_OPEN: 'manage_tools_table_row_open',
      TABLE_BULK_DELETE: 'manage_tools_table_bulk_delete',
      TABLE_SELECT_ALL: 'manage_tools_table_select_all',
      TABLE_CLEAR_SELECTION: 'manage_tools_table_clear_selection',
      FORM_SAVE: 'manage_tools_form_save',
      FORM_SAVE_AND_TEST: 'manage_tools_form_save_and_test',
      FORM_TEST: 'manage_tools_form_test',
      FORM_CANCEL: 'manage_tools_form_cancel',
      FORM_HEADER_CONTEXT_OPEN: 'manage_tools_form_header_context_open',
      FORM_HEADER_CLONE: 'manage_tools_form_header_clone',
      FORM_HEADER_DELETE: 'manage_tools_form_header_delete',
      TEST_EXECUTE: 'manage_tools_test_execute',
      TEST_DOCS_LINK: 'manage_tools_test_docs_link',
      BULK_IMPORT_SUBMIT: 'manage_tools_bulk_import_submit',
      BULK_IMPORT_CANCEL: 'manage_tools_bulk_import_cancel',
      BULK_IMPORT_SELECT_ALL: 'manage_tools_bulk_import_select_all',
      BULK_IMPORT_CLEAR_SELECTION: 'manage_tools_bulk_import_clear_selection',
      BULK_IMPORT_SELECTION_MENU_OPEN: 'manage_tools_bulk_import_selection_menu_open',
      VISUALIZATION_ACTION: 'manage_tools_visualization_action',
    },
    /** Agent overview, create/edit form, edit-details flyout */
    manageAgent: {
      OVERVIEW_COPY_ID: 'manage_agent_overview_copy_id',
      OVERVIEW_DOCS_LINK: 'manage_agent_overview_docs_link',
      OVERVIEW_EDIT_DETAILS: 'manage_agent_overview_edit_details',
      FORM_SAVE: 'manage_agent_form_save',
      FORM_SAVE_AND_CHAT: 'manage_agent_form_save_and_chat',
      FORM_CHAT_NAV: 'manage_agent_form_chat_nav',
      FORM_CANCEL: 'manage_agent_form_cancel',
      FORM_MORE_MENU_OPEN: 'manage_agent_form_more_menu_open',
      FORM_SAVE_OVERFLOW_OPEN: 'manage_agent_form_save_overflow_open',
      FORM_CLONE: 'manage_agent_form_clone',
      FORM_DELETE: 'manage_agent_form_delete',
      FORM_CREATE_LEARN_MORE: 'manage_agent_form_create_learn_more',
      FORM_ERROR_BACK_TO_LIST: 'manage_agent_form_error_back_to_list',
      EDIT_DETAILS_SAVE: 'manage_agent_edit_details_save',
      EDIT_DETAILS_CANCEL: 'manage_agent_edit_details_cancel',
    },
    /** Global agents library (`/manage/agents`) */
    manageAgents: {
      NEW_AGENT: 'manage_agents_new_agent',
      DOCS_LEARN_MORE: 'manage_agents_docs_learn_more',
      TABLE_ROW_EDIT_OPEN: 'manage_agents_table_row_edit_open',
      TABLE_ACTION_DELETE: 'manage_agents_table_action_delete',
    },
    /** Global skills library and per-agent skill flyouts */
    manageSkills: {
      NEW_SKILL: 'manage_skills_new_skill',
      TABLE_CONTEXT_OPEN: 'manage_skills_table_context_open',
      TABLE_ROW_OPEN: 'manage_skills_table_row_open',
      TABLE_CONTEXT_VIEW: 'manage_skills_table_context_view',
      TABLE_CONTEXT_EDIT: 'manage_skills_table_context_edit',
      TABLE_CONTEXT_DELETE: 'manage_skills_table_context_delete',
      FLYOUT_LIBRARY_LINK: 'manage_skills_flyout_library_link',
      FLYOUT_SAVE: 'manage_skills_flyout_save',
      FLYOUT_CANCEL: 'manage_skills_flyout_cancel',
    },
    /** Global plugins library */
    managePlugins: {
      INSTALL_MENU_OPEN: 'manage_plugins_install_menu_open',
      INSTALL_FROM_URL: 'manage_plugins_install_from_url',
      INSTALL_UPLOAD: 'manage_plugins_install_upload',
      TABLE_ROW_OPEN: 'manage_plugins_table_row_open',
      TABLE_CONTEXT_OPEN: 'manage_plugins_table_context_open',
      TABLE_CONTEXT_VIEW: 'manage_plugins_table_context_view',
      TABLE_CONTEXT_DELETE: 'manage_plugins_table_context_delete',
    },
  },

  // `data-ebt-detail` — entity typing
  entity: {
    AGENT: 'agent',
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
    conversation: {
      EMBED_AGENTS_MENU: 'embed_agents_menu',
      EMBED_CONVERSATIONS_MENU: 'embed_conversations_menu',
      EMBED_MAIN_MENU: 'embed_main_menu',
    },
  },

  format: {} as const,
} as const;

export type AgentBuilderUiEbt = typeof AGENT_BUILDER_UI_EBT;

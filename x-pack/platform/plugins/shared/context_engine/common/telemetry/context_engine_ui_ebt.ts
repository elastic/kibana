/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable `data-ebt-*` wire values for Context Engine UI click tracking.
 * Used with `getEbtProps()` from `@kbn/ebt-click`.
 *
 * Page-level elements identify navigation and chrome. Section-level elements
 * (suffix `.panel`, `.card`, etc.) identify interactions within a page area.
 */
const ebtElement = {
  aiIndexListPage: 'contextEngine.aiIndexListPage',
  aiIndexListPageCard: 'contextEngine.aiIndexListPage.card',
  aiIndexListPageManagedRow: 'contextEngine.aiIndexListPage.managedRow',
  aiIndexListPageToolbar: 'contextEngine.aiIndexListPage.toolbar',
  aiIndexListPageDeleteModal: 'contextEngine.aiIndexListPage.deleteModal',
  aiIndexCreatePage: 'contextEngine.aiIndexCreatePage',
  aiIndexCreatePageTraceSelector: 'contextEngine.aiIndexCreatePage.traceSelector',
  aiIndexDetailPage: 'contextEngine.aiIndexDetailPage',
  aiIndexDetailPageDescriptionPanel: 'contextEngine.aiIndexDetailPage.descriptionPanel',
  aiIndexDetailPageTracesPanel: 'contextEngine.aiIndexDetailPage.tracesPanel',
  aiIndexDetailPageSourcesPanel: 'contextEngine.aiIndexDetailPage.sourcesPanel',
  aiIndexDetailPageAutomationsPanel: 'contextEngine.aiIndexDetailPage.automationsPanel',
  aiIndexDetailPageSignalsPanel: 'contextEngine.aiIndexDetailPage.signalsPanel',
  aiIndexDetailPageKiListPanel: 'contextEngine.aiIndexDetailPage.kiListPanel',
  aiIndexEditFlyout: 'contextEngine.aiIndexEditFlyout',
  aiIndexEditFlyoutSourcePicker: 'contextEngine.aiIndexEditFlyout.sourcePicker',
  aiIndexDetailFlyout: 'contextEngine.aiIndexDetailFlyout',
  aiIndexDetailFlyoutSignalGroup: 'contextEngine.aiIndexDetailFlyout.signalGroup',
  aiIndexDetailFlyoutSignalDetail: 'contextEngine.aiIndexDetailFlyout.signalDetail',
} as const;

const ebtAction = {
  navigation: {
    BACK: 'back',
    LEARN_MORE_DOCS: 'learn_more_docs',
  },
  aiIndexList: {
    CREATE: 'create',
    OPEN_CARD: 'open_card',
    OPEN_MANAGED_ROW: 'open_managed_row',
    CARD_ACTIONS_MENU: 'open_actions_menu',
    DELETE: 'delete',
    CLEAR_FILTERS: 'clear_filters',
    DELETE_KI_CHECKBOX: 'delete_ki_checkbox',
    DELETE_AUTOMATIONS_CHECKBOX: 'delete_automations_checkbox',
  },
  aiIndexCreate: {
    CREATE: 'create',
    SELECT_STORAGE_INDEX: 'select_index',
    SELECT_STORAGE_DATA_STREAM: 'select_data_stream',
  },
  aiIndexDetail: {
    TAB_OVERVIEW: 'tab_overview',
    TAB_KNOWLEDGE_INDICATORS: 'tab_knowledge_indicators',
  },
  description: {
    EDIT: 'edit_description',
    SAVE: 'save_description',
    CANCEL: 'cancel_description',
  },
  traces: {
    EDIT: 'edit_traces',
    SAVE: 'save_traces',
    CANCEL: 'cancel_traces',
    TOGGLE_ELASTIC_AGENT: 'toggle_elastic_agent',
    TOGGLE_DATA_STREAM: 'toggle_data_stream',
    SELECT_AGENT: 'select_agent',
    SELECT_DATA_STREAM: 'select_data_stream',
  },
  sources: {
    EDIT: 'edit_sources',
    SAVE: 'save_sources',
    CANCEL: 'cancel_sources',
    TAB_ESQL: 'tab_esql',
    TAB_CONNECTORS: 'tab_connectors',
    ADD_ESQL: 'add_esql',
    CREATE_CONNECTOR: 'create_connector',
    TOGGLE_CONNECTOR: 'toggle_connector',
    REMOVE_SOURCE: 'remove_source',
  },
  automations: {
    SUGGEST: 'suggest_automation',
    CREATE: 'create_automation',
    EDIT: 'edit_automations',
    SAVE: 'save_automations',
    CANCEL: 'cancel_automations',
    PREVIEW_WORKFLOW: 'preview_automation',
    OPEN_WORKFLOW: 'open_workflow',
    REMOVE: 'remove_automation',
  },
  signals: {
    ANALYZE: 'analyze_signals',
    VIEW_GROUP: 'view_group',
    VIEW_SIGNAL: 'view_signal',
    GROUP_ANALYZE: 'group_analyze',
    LOAD_MORE: 'load_more_signals',
    PREVIOUS: 'previous_signal',
    NEXT: 'next_signal',
    INTERACT_FEEDBACK_AGENT: 'interact_feedback_agent',
  },
  kiList: {
    DEST_LINK: 'open_destination',
    DISCOVER_LINK: 'open_ki_discover',
    FILTER_TYPE: 'filter_type',
    LOAD_MORE: 'load_more_ki',
    DISCOVER_CAP_REACHED: 'open_ki_discover_cap_reached',
    TOGGLE_ROW: 'toggle_row',
  },
} as const;

export const CONTEXT_ENGINE_UI_EBT = {
  element: ebtElement,
  action: ebtAction,
} as const;

export type ContextEngineUiEbt = typeof CONTEXT_ENGINE_UI_EBT;

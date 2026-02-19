/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';

import type {
  AgentsServiceStartContract,
  AttachmentServiceStartContract,
  EventsServiceStartContract,
  ToolServiceStartContract,
} from '@kbn/agent-builder-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { AIAssistantManagementSelectionPluginPublicStart } from '@kbn/ai-assistant-management-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { EmbeddableConversationProps } from './embeddable/types';
import type { OpenConversationSidebarOptions } from './sidebar/types';

export interface ConversationSidebarRef {
  close(): void;
}

export interface OpenConversationSidebarReturn {
  flyoutRef: ConversationSidebarRef;
}

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface AgentBuilderSetupDependencies {
  lens: LensPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  licenseManagement?: LicenseManagementUIPluginSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
  uiActions: UiActionsSetup;
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export interface AgentBuilderStartDependencies {
  aiAssistantManagementSelection: AIAssistantManagementSelectionPluginPublicStart;
  inference: InferencePublicStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  cloud: CloudStart;
  share: SharePluginStart;
  uiActions: UiActionsStart;
  spaces?: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export interface AgentBuilderPluginSetup {}

/**
 * Public start contract for the browser-side agentBuilder plugin.
 */
export interface AgentBuilderPluginStart {
  /**
   * Agent service contract, can be used to list agents.
   */
  agents: AgentsServiceStartContract;
  /**
   * Attachment service contract, can be used to register and retrieve attachment UI definitions.
   */
  attachments: AttachmentServiceStartContract;
  /**
   * Tool service contract, can be used to list or execute tools.
   */
  tools: ToolServiceStartContract;
  /**
   * Events service contract, can be used to listen to chat events.
   */
  events: EventsServiceStartContract;
  /**
   * Opens the conversation sidebar.
   *
   * @param options - Configuration options for the sidebar
   * @returns An object containing the sidebar reference
   *
   * @example
   * ```tsx
   * // Open a new conversation with close handler
   * const { flyoutRef } = plugins.agentBuilder.openConversationFlyout({
   *   onClose: () => console.log('Sidebar closed')
   * });
   *
   * // Programmatically close the sidebar
   * flyoutRef.close();
   * ```
   */
  openConversationFlyout: (
    options?: OpenConversationSidebarOptions
  ) => OpenConversationSidebarReturn;
  /**
   * Toggles the conversation sidebar.
   *
   * If the sidebar is open, it will be closed. Otherwise, it will be opened.
   */
  toggleConversationFlyout: (options?: OpenConversationSidebarOptions) => void;
  setConversationFlyoutActiveConfig: (config: EmbeddableConversationProps) => void;
  clearConversationFlyoutActiveConfig: () => void;
}

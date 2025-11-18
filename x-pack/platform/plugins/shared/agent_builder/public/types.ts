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
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { ToolServiceStartContract } from '@kbn/agent-builder-browser';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { InferencePublicStart } from '@kbn/inference-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { LicenseManagementUIPluginSetup } from '@kbn/license-management-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { EmbeddableConversationProps } from './embeddable/types';
import type { OpenConversationFlyoutOptions } from './flyout/types';

export interface ConversationFlyoutRef {
  close(): void;
}

export interface OpenConversationFlyoutReturn {
  flyoutRef: ConversationFlyoutRef;
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
}

export interface AgentBuilderStartDependencies {
  inference: InferencePublicStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  dataViews: DataViewsPublicPluginStart;
  cloud: CloudStart;
  share: SharePluginStart;
  uiActions: UiActionsStart;
  spaces?: SpacesPluginStart;
}

export interface AgentBuilderPluginSetup {}

/**
 * Public start contract for the browser-side Agent Builder plugin.
 */
export interface AgentBuilderPluginStart {
  /**
   * Tool service contract, can be used to list or execute tools.
   */
  tools: ToolServiceStartContract;
  /**
   * Opens a conversation flyout.
   *
   * @param options - Configuration options for the flyout
   * @returns An object containing the flyout reference
   *
   * @example
   * ```tsx
   * // Open a new conversation with close handler
   * const { flyoutRef } = plugins.agentBuilder.openConversationFlyout({
   *   onClose: () => console.log('Flyout closed')
   * });
   *
   * // Programmatically close the flyout
   * flyoutRef.close();
   * ```
   */
  openConversationFlyout: (options?: OpenConversationFlyoutOptions) => OpenConversationFlyoutReturn;
  setConversationFlyoutActiveConfig: (config: EmbeddableConversationProps) => void;
  clearConversationFlyoutActiveConfig: () => void;
}

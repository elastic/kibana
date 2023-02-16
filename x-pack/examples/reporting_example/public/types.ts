/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { ReportingStart } from '@kbn/reporting-plugin/public';
import type { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import type { MyForwardableState } from '../common';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  share: SharePluginSetup;
  screenshotMode: ScreenshotModePluginSetup;
  savedObjectsManagement: SavedObjectsManagementPluginStart;
}
export interface StartDeps {
  navigation: NavigationPublicPluginStart;
  reporting: ReportingStart;
}

export type { MyForwardableState };

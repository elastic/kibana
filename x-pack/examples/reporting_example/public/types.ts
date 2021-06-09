/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { ScreenshotModePluginSetup } from 'src/plugins/screenshot_mode/public';
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import { ReportingStart } from '../../../plugins/reporting/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  screenshotMode: ScreenshotModePluginSetup;
}
export interface StartDeps {
  navigation: NavigationPublicPluginStart;
  reporting: ReportingStart;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public/types';
import { DefaultEmbeddableApi, EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import {
  PublishesDataLoading,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { CoreStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { SettingsStart } from '@kbn/core-ui-settings-browser';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmbeddableAlertsTablePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmbeddableAlertsTablePluginStart {}

export interface SetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface StartDependencies {
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  fieldFormats: FieldFormatsRegistry;
  application: CoreStart['application'];
  licensing: LicensingPluginStart;
  settings: SettingsStart;
  cases: CasesPublicStart;
}

export type EmbeddableAlertsTableSerializedState = SerializedTitles & SerializedTimeRange;

export type EmbeddableAlertsTableRuntimeState = EmbeddableAlertsTableSerializedState;

export type EmbeddableAlertsTableApi = DefaultEmbeddableApi<EmbeddableAlertsTableSerializedState> &
  PublishesDataLoading;

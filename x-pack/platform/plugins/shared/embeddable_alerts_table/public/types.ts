/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public/types';
import type { DefaultEmbeddableApi, EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import type {
  PublishesDataLoading,
  SerializedTimeRange,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmbeddableAlertsTablePublicSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EmbeddableAlertsTablePublicStart {}

export interface EmbeddableAlertsTablePublicSetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface EmbeddableAlertsTablePublicStartDependencies {
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

export type EmbeddableAlertsTableApi = DefaultEmbeddableApi<EmbeddableAlertsTableSerializedState> &
  PublishesDataLoading;

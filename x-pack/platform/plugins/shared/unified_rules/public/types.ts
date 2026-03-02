/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChromeBreadcrumb,
  CoreStart,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';

export interface UnifiedRulesServices extends CoreStart {
  actions: ActionsPublicPluginSetup;
  cloud?: CloudSetup;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  storage?: Storage;
  isCloud: boolean;
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
  ruleTypeRegistry: RuleTypeRegistryContract;
  history: ScopedHistory;
  kibanaFeatures: KibanaFeature[];
  element: HTMLElement;
  theme: ThemeServiceStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  licensing: LicensingPluginStart;
  expressions: ExpressionsStart;
  isServerless: boolean;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  share?: SharePluginStart;
  contentManagement?: ContentManagementPublicStart;
  uiActions?: UiActionsStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

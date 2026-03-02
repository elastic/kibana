/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

interface PluginsSetup {
  actions: ActionsPublicPluginSetup;
  cloud?: CloudSetup;
}

interface PluginsStart {
  cases?: CasesPublicStart;
  security?: SecurityPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewEditor: DataViewEditorStart;
  charts: ChartsPluginStart;
  alerting?: AlertingStart;
  spaces?: SpacesPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  licensing: LicensingPluginStart;
  expressions: ExpressionsStart;
  serverless?: ServerlessPluginStart;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  uiActions: UiActionsStart;
  contentManagement?: ContentManagementPublicStart;
  share?: SharePluginStart;
  features?: FeaturesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export class UnifiedRulesPlugin implements Plugin<void, void, PluginsSetup, PluginsStart> {
  constructor(_context: PluginInitializerContext) {}

  public setup(core: CoreSetup<PluginsStart>, plugins: PluginsSetup): void {
    core.application.register({
      id: 'rules',
      appRoute: '/app/rules',
      title: i18n.translate('xpack.unifiedRules.app.title', {
        defaultMessage: 'Rules',
      }),
      category: DEFAULT_APP_CATEGORIES.management,
      visibleIn: ['sideNav'],
      async mount(params: AppMountParameters) {
        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          PluginsStart,
          unknown
        ];

        const { renderRulesPageApp } = await import('./application/rules_page_app');

        let kibanaFeatures: KibanaFeature[] = [];
        if (pluginsStart.features) {
          try {
            kibanaFeatures = await pluginsStart.features.getFeatures();
          } catch (err) {
            kibanaFeatures = [];
          }
        }

        return renderRulesPageApp({
          ...coreStart,
          actions: plugins.actions,
          cloud: plugins.cloud,
          data: pluginsStart.data,
          dataViews: pluginsStart.dataViews,
          dataViewEditor: pluginsStart.dataViewEditor,
          charts: pluginsStart.charts,
          alerting: pluginsStart.alerting,
          spaces: pluginsStart.spaces,
          unifiedSearch: pluginsStart.unifiedSearch,
          isCloud: Boolean(plugins.cloud?.isCloudEnabled),
          element: params.element,
          theme: coreStart.theme,
          storage: new Storage(window.localStorage),
          setBreadcrumbs: coreStart.chrome.setBreadcrumbs,
          history: params.history,
          actionTypeRegistry: pluginsStart.triggersActionsUi.actionTypeRegistry,
          ruleTypeRegistry: pluginsStart.triggersActionsUi.ruleTypeRegistry,
          kibanaFeatures,
          licensing: pluginsStart.licensing,
          expressions: pluginsStart.expressions,
          isServerless: !!pluginsStart.serverless,
          fieldFormats: pluginsStart.fieldFormats,
          lens: pluginsStart.lens,
          fieldsMetadata: pluginsStart.fieldsMetadata,
          contentManagement: pluginsStart.contentManagement,
          share: pluginsStart.share,
          uiActions: pluginsStart.uiActions,
          triggersActionsUi: pluginsStart.triggersActionsUi,
          cases: pluginsStart.cases,
          security: pluginsStart.security,
        });
      },
    });
  }

  public start(): void {}
  public stop(): void {}
}

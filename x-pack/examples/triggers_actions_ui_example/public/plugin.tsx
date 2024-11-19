/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppMountParameters, CoreStart } from '@kbn/core/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { getConnectorType as getSystemLogExampleConnectorType } from './connector_types/system_log_example/system_log_example';

export interface TriggersActionsUiExamplePublicSetupDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface TriggersActionsUiExamplePublicStartDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginSetup;
  dataViews: DataViewsPublicPluginStart;
  dataViewsEditor: DataViewEditorStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  licensing: LicensingPluginStart;
}

export class TriggersActionsUiExamplePlugin
  implements Plugin<void, void, TriggersActionsUiExamplePublicSetupDeps>
{
  public setup(
    core: CoreSetup<TriggersActionsUiExamplePublicStartDeps, void>,
    setup: TriggersActionsUiExamplePublicSetupDeps
  ) {
    const { developerExamples } = setup;

    core.application.register({
      id: 'triggersActionsUiExample',
      title: 'Triggers Actions UI Example',
      visibleIn: [],
      // category set as cases expects the label to exist
      category: {
        id: 'fakeId',
        label: 'fakeLabel',
      },
      mount: async (params: AppMountParameters) => {
        const [coreStart, devStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp(coreStart, devStart, params);
      },
    });

    developerExamples.register({
      appId: 'triggersActionsUiExample',
      title: 'Shared Reusable Alerting Components',
      description:
        'Sandbox for shared reusable alerting components (triggers actions UI shareable components)',
    });
  }

  public start(_: CoreStart, { triggersActionsUi }: TriggersActionsUiExamplePublicStartDeps) {
    triggersActionsUi.actionTypeRegistry.register(getSystemLogExampleConnectorType());
  }

  public stop() {}
}

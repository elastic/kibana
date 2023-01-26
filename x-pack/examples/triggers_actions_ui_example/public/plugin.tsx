/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Plugin,
  CoreSetup,
  AppMountParameters,
  AppNavLinkStatus,
  CoreStart,
} from '@kbn/core/public';
import { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { get } from 'lodash';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import {
  AlertsTableConfigurationRegistry,
  AlertsTableFlyoutBaseProps,
  AlertTableFlyoutComponent,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { EuiDataGridColumn } from '@elastic/eui';

export interface TriggersActionsUiExamplePublicSetupDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface TriggersActionsUiExamplePublicStartDeps {
  alerting: AlertingSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
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
      navLinkStatus: AppNavLinkStatus.hidden,
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

  public start(
    coreStart: CoreStart,
    { triggersActionsUi }: TriggersActionsUiExamplePublicStartDeps
  ) {
    const {
      alertsTableConfigurationRegistry,
    }: { alertsTableConfigurationRegistry: TypeRegistry<AlertsTableConfigurationRegistry> } =
      triggersActionsUi;

    const columns: EuiDataGridColumn[] = [
      {
        id: 'event.action',
        displayAsText: 'Alert status',
        initialWidth: 150,
      },
      {
        id: '@timestamp',
        displayAsText: 'Last updated',
        initialWidth: 250,
      },
      {
        id: 'kibana.alert.duration.us',
        displayAsText: 'Duration',
        initialWidth: 150,
      },
      {
        id: 'kibana.alert.reason',
        displayAsText: 'Reason',
      },
    ];

    const FlyoutBody: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => (
      <ul>
        {columns.map((column) => (
          <li data-test-subj={`alertsFlyout${column.displayAsText}`} key={column.id}>
            {get(alert as any, column.id, [])[0]}
          </li>
        ))}
      </ul>
    );

    const FlyoutHeader: AlertTableFlyoutComponent = ({ alert }: AlertsTableFlyoutBaseProps) => {
      const { 'kibana.alert.rule.name': name } = alert;
      return <div data-test-subj="alertsFlyoutName">{name}</div>;
    };

    const useInternalFlyout = () => ({
      body: FlyoutBody,
      header: FlyoutHeader,
      footer: null,
    });

    const sort: SortCombinations[] = [
      {
        'event.action': {
          order: 'asc',
        },
      },
    ];

    const config: AlertsTableConfigurationRegistry = {
      id: 'observabilityCases',
      casesFeatureId: 'observabilityCases',
      columns,
      useInternalFlyout,
      getRenderCellValue: () => (props: any) => {
        const value = props.data.find((d: any) => d.field === props.columnId)?.value ?? [];

        if (Array.isArray(value)) {
          return <>{value.length ? value.join() : '--'}</>;
        }

        return <>{value}</>;
      },
      sort,
    };

    alertsTableConfigurationRegistry.register(config);
  }

  public stop() {}
}

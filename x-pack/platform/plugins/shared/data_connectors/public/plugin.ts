/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppStatus,
  type AppUpdatableFields,
  type AppUpdater,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { KIBANA_WORKPLACE_AI_PROJECT, type KibanaProject } from '@kbn/projects-solutions-groups';
import { BehaviorSubject } from 'rxjs';
import { registerApp } from './register';
import type {
  DataConnectorsPluginSetup,
  DataConnectorsPluginSetupDependencies,
  DataConnectorsPluginStart,
  DataConnectorsPluginStartDependencies,
} from './types';

const enabledSolutions: readonly KibanaProject[] = [KIBANA_WORKPLACE_AI_PROJECT];

const inaccessibleState: AppUpdatableFields = {
  status: AppStatus.inaccessible,
  visibleIn: [],
};

const accessibleState: AppUpdatableFields = {
  status: AppStatus.accessible,
  visibleIn: ['sideNav', 'globalSearch'],
};

export class DataConnectorsPlugin
  implements
    Plugin<
      DataConnectorsPluginSetup,
      DataConnectorsPluginStart,
      DataConnectorsPluginSetupDependencies,
      DataConnectorsPluginStartDependencies
    >
{
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({
    status: AppStatus.inaccessible,
    visibleIn: [],
  }));
  constructor(context: PluginInitializerContext) {}
  setup(
    core: CoreSetup<DataConnectorsPluginStartDependencies, DataConnectorsPluginStart>
  ): DataConnectorsPluginSetup {
    registerApp({ core, updater$: this.appUpdater$ });

    return {};
  }
  start(core: CoreStart): DataConnectorsPluginStart {
    core.chrome.getActiveSolutionNavId$().subscribe((solutionId) => {
      this.appUpdater$.next(() =>
        !solutionId || !enabledSolutions.includes(solutionId) ? inaccessibleState : accessibleState
      );
    });

    return {};
  }
}

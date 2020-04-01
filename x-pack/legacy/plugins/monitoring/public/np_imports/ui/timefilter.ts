/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IRootScopeService } from 'angular';
import { npStart, registerTimefilterWithGlobalStateFactory } from '../legacy_imports';

const {
  core: { uiSettings },
} = npStart;
export const { timefilter } = npStart.plugins.data.query.timefilter;

uiSettings.overrideLocalDefault(
  'timepicker:refreshIntervalDefaults',
  JSON.stringify({ value: 10000, pause: false })
);
uiSettings.overrideLocalDefault(
  'timepicker:timeDefaults',
  JSON.stringify({ from: 'now-1h', to: 'now' })
);

export const registerTimefilterWithGlobalState = (app: IModule) => {
  app.run((globalState: any, $rootScope: IRootScopeService) => {
    globalState.fetch();
    globalState.$inheritedGlobalState = true;
    globalState.save();
    registerTimefilterWithGlobalStateFactory(timefilter, globalState, $rootScope);
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IModule, IRootScopeService } from 'angular';
import { npStart, registerTimefilterWithGlobalStateFactory } from '../legacy_imports';

export const { timefilter } = npStart.plugins.data.query.timefilter;

export const registerTimefilterWithGlobalState = (app: IModule) => {
  app.run((globalState: any, $rootScope: IRootScopeService) => {
    registerTimefilterWithGlobalStateFactory(timefilter, globalState, $rootScope);
    $rootScope.$applyAsync(() => {
      timefilter.setRefreshInterval({ value: 10000, pause: false });
      timefilter.setTime({ from: 'now-1h', to: 'now' });
    });
  });
};

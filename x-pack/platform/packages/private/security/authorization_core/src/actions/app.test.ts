/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppActions } from './app';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((appid: any) => {
    test(`appId of ${JSON.stringify(appid)} throws error`, () => {
      const appActions = new AppActions();
      expect(() => appActions.get(appid)).toThrowErrorMatchingSnapshot();
    });
  });
});

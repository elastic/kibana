/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { IUiSettingsClient, ChromeStart } from 'src/core/public';
import { TimefilterContract, TimeHistoryContract } from 'src/plugins/data/public';

interface UiContextValue {
  chrome: ChromeStart;
  timefilter: TimefilterContract;
  timeHistory: TimeHistoryContract;
  uiSettings: IUiSettingsClient;
}

// This provides ui/* based imports via React Context.
// Because these dependencies can use regular imports,
// they are just passed on as the default value
// of the Context which means it's not necessary
// to add <UiContext.Provider value="..." />... to the
// wrapping angular directive, reducing a lot of boilerplate.
// The custom hooks like useUiContext() need to be mocked in
// tests because we rely on the properly set up default value.
// Different custom hooks can be created to access parts only
// from the full context value, see useUiChromeContext() as an example.
export const UiContext = React.createContext<Partial<UiContextValue>>({});

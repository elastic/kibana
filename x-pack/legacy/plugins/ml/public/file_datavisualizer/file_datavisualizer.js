/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FileDataVisualizerView } from './components/file_datavisualizer_view';

import React from 'react';

import chrome from 'ui/chrome';
import { timefilter } from 'ui/timefilter';
import { timeHistory } from 'ui/timefilter/time_history';

import { NavigationMenuContext } from '../util/context_utils';
import { NavigationMenu } from '../components/navigation_menu/navigation_menu';

export function FileDataVisualizerPage({ indexPatterns, kibanaConfig }) {
  timefilter.disableTimeRangeSelector();
  timefilter.disableAutoRefreshSelector();

  return (
    <NavigationMenuContext.Provider value={{ chrome, timefilter, timeHistory }}>
      <NavigationMenu tabId="datavisualizer" />
      <FileDataVisualizerView indexPatterns={indexPatterns} kibanaConfig={kibanaConfig} />
    </NavigationMenuContext.Provider>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { timefilter } from 'ui/timefilter';

import { NavigationMenu } from '../../components/navigation_menu/navigation_menu';

import { FileDataVisualizerView } from './components/file_datavisualizer_view';

export function FileDataVisualizerPage({ indexPatterns, kibanaConfig }) {
  timefilter.disableTimeRangeSelector();
  timefilter.disableAutoRefreshSelector();

  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      <FileDataVisualizerView indexPatterns={indexPatterns} kibanaConfig={kibanaConfig} />
    </Fragment>
  );
}

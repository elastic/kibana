/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { timefilter } from 'ui/timefilter';
import { IndexPatternsContract } from '../../../../../../../../src/plugins/data/public';

import { KibanaConfigTypeFix } from '../../contexts/kibana';
import { NavigationMenu } from '../../components/navigation_menu';

// @ts-ignore
import { FileDataVisualizerView } from './components/file_datavisualizer_view/index';

export interface FileDataVisualizerPageProps {
  indexPatterns: IndexPatternsContract;
  kibanaConfig: KibanaConfigTypeFix;
}

export const FileDataVisualizerPage: FC<FileDataVisualizerPageProps> = ({
  indexPatterns,
  kibanaConfig,
}) => {
  timefilter.disableTimeRangeSelector();
  timefilter.disableAutoRefreshSelector();

  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      <FileDataVisualizerView indexPatterns={indexPatterns} kibanaConfig={kibanaConfig} />
    </Fragment>
  );
};

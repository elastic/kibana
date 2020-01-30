/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { IUiSettingsClient } from 'src/core/public';

import { getTimefilter } from '../../util/dependency_cache';
import { NavigationMenu } from '../../components/navigation_menu';
import { getIndexPatternsContract } from '../../util/index_utils';

// @ts-ignore
import { FileDataVisualizerView } from './components/file_datavisualizer_view/index';

export interface FileDataVisualizerPageProps {
  kibanaConfig: IUiSettingsClient;
}

export const FileDataVisualizerPage: FC<FileDataVisualizerPageProps> = ({ kibanaConfig }) => {
  const timefilter = getTimefilter();
  timefilter.disableTimeRangeSelector();
  timefilter.disableAutoRefreshSelector();
  const indexPatterns = getIndexPatternsContract();
  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      <FileDataVisualizerView indexPatterns={indexPatterns} kibanaConfig={kibanaConfig} />
    </Fragment>
  );
};

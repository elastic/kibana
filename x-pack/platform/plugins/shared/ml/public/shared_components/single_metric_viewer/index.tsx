/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type {
  SingleMetricViewerServices,
  SingleMetricViewerEmbeddableApi,
} from '../../embeddables/types';
import type { MlDependencies } from '../../application/app';
import type { SingleMetricViewerSharedComponent } from './single_metric_viewer';

const SingleMetricViewerLazy = dynamic(async () => import('./single_metric_viewer'));

export const getSingleMetricViewerComponent = (
  coreStart: CoreStart,
  pluginStart: MlDependencies,
  mlServices: SingleMetricViewerServices,
  api?: SingleMetricViewerEmbeddableApi
): SingleMetricViewerSharedComponent => {
  return (props) => {
    return (
      <SingleMetricViewerLazy
        coreStart={coreStart}
        pluginStart={pluginStart}
        mlServices={mlServices}
        api={api}
        {...props}
      />
    );
  };
};

export type { SingleMetricViewerSharedComponent } from './single_metric_viewer';

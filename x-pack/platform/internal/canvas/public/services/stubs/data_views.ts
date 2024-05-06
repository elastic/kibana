/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { CanvasDataViewsService } from '../data_views';

type DataViewsServiceFactory = PluginServiceFactory<CanvasDataViewsService>;

export const dataViewsServiceFactory: DataViewsServiceFactory = () => ({
  getDataViews: () =>
    Promise.resolve([
      { id: 'dataview1', title: 'dataview1', name: 'Data view 1' },
      { id: 'dataview2', title: 'dataview2', name: 'Data view 2' },
    ]),
  getFields: () => Promise.resolve(['field1', 'field2']),
  getDefaultDataView: () =>
    Promise.resolve({
      id: 'defaultDataViewId',
      title: 'defaultDataView',
      name: 'Default data view',
    }),
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsService } from '@kbn/data-views-plugin/common';

export const createDataViews = async (dataViewsService: DataViewsService) => {
  const dataView = (await dataViewsService.find('logs-osquery_manager.result*', 1))[0];
  if (!dataView) {
    await dataViewsService.createAndSave({
      title: 'logs-osquery_manager.result*',
      timeFieldName: '@timestamp',
      namespaces: ['*'],
    });
  }
};

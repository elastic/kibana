/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { DataRequestHandlerContext, IScopedSearchClient } from '@kbn/data-plugin/server';
import type { StartPlugins, OsqueryPluginStart } from '../types';

export const getScopedSearch = async (
  context: DataRequestHandlerContext,
  request: KibanaRequest,
  cpsActive: boolean,
  getStartServices: CoreSetup<StartPlugins, OsqueryPluginStart>['getStartServices']
): Promise<IScopedSearchClient> => {
  if (cpsActive) {
    const [, { data }] = await getStartServices();

    return data.search.asScoped(request, { projectRouting: 'space' });
  }

  return context.search;
};

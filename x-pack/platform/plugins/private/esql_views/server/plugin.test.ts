/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { ESQL_VIEWS_CAPABILITIES, PLUGIN_ID } from '../common';
import { EsqlViewsServerPlugin } from './plugin';

describe('EsqlViewsServerPlugin', () => {
  it('registers navigation and action capabilities backed by view privileges', () => {
    const features = featuresPluginMock.createSetup();
    const plugin = new EsqlViewsServerPlugin();

    plugin.setup(coreMock.createSetup(), { features });

    expect(features.registerElasticsearchFeature).toHaveBeenCalledWith({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            '*': ['read_view_metadata'],
          },
          ui: [ESQL_VIEWS_CAPABILITIES.read],
        },
        {
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            '*': ['read_view_metadata', 'create_view'],
          },
          ui: [ESQL_VIEWS_CAPABILITIES.create, ESQL_VIEWS_CAPABILITIES.edit],
        },
        {
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            '*': ['read_view_metadata', 'delete_view'],
          },
          ui: [ESQL_VIEWS_CAPABILITIES.delete],
        },
      ],
    });
  });
});

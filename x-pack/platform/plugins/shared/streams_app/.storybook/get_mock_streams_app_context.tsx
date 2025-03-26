/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import type { DataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public/services/data_streams_stats/data_streams_stats_client';
import { getChartsTheme } from '@elastic/charts';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import { DeepPartial } from 'utility-types';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { IUnifiedSearchPluginServices, SearchBar } from '@kbn/unified-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useMemo } from 'react';
import { merge } from 'lodash';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StreamsAppKibanaContext } from '../public/hooks/use_kibana';
import { StreamsTelemetryService } from '../public/telemetry/service';
import { StreamsAppStartDependencies } from '../public/types';

export function getMockStreamsAppContext(): StreamsAppKibanaContext {
  const appParams = coreMock.createAppMountParameters();
  const core = coreMock.createStart();
  const coreSetup = coreMock.createSetup();

  const telemetryService = new StreamsTelemetryService();
  telemetryService.setup(coreSetup.analytics);

  const dataMock = dataPluginMock.createStartContract();

  jest.spyOn(dataMock.query.timefilter.timefilter, 'useTimefilter').mockReturnValue({
    timeRange: {
      from: 'now-15m',
      to: 'now',
    },
    absoluteTimeRange: {
      start: new Date().getTime() - 15 * 60 * 1000,
      end: new Date().getTime(),
    },
    setTimeRange: jest.fn(),
  });

  return {
    appParams,
    core,
    dependencies: {
      start: {
        dataViews: {},
        data: dataMock,
        unifiedSearch: merge({}, unifiedSearchPluginMock.createStartContract(), {
          ui: {
            SearchBar: function SearchBarWithContext(props: {}) {
              const unifiedSearchServices = useMemo(() => {
                return {
                  data: dataMock,
                  storage: new Storage(window.localStorage),
                  uiSettings: core.uiSettings,
                } as unknown as IUnifiedSearchPluginServices;
              }, []);
              return (
                <KibanaContextProvider services={unifiedSearchServices}>
                  <SearchBar {...props} />
                </KibanaContextProvider>
              );
            },
          },
        }),
        streams: {},
        share: {},
        navigation: {},
        savedObjectsTagging: {},
        fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
        licensing: {},
        discover: {
          locator: {
            getRedirectUrl: () => '',
          },
        },
        charts: {
          theme: {
            useSparklineOverrides: () => {
              return {} as ReturnType<
                StreamsAppStartDependencies['charts']['theme']['useSparklineOverrides']
              >;
            },
            useChartsBaseTheme: () => {
              return getChartsTheme({ name: 'base', darkMode: false });
            },
          },
        },
      } as DeepPartial<StreamsAppStartDependencies>,
    } as { start: StreamsAppStartDependencies },
    services: {
      dataStreamsClient: Promise.resolve({} as unknown as DataStreamsStatsClient),
      PageTemplate: () => null,
      telemetryClient: telemetryService.getClient(),
    },
    isServerless: false,
  };
}

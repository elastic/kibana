/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartsTheme } from '@elastic/charts';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public/services/data_streams_stats/data_streams_stats_client';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { fieldsMetadataPluginPublicMock } from '@kbn/fields-metadata-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { IUnifiedSearchPluginServices } from '@kbn/unified-search-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { merge } from 'lodash';
import React, { useMemo } from 'react';
import { Subject } from 'rxjs';
import type { DeepPartial } from 'utility-types';
import type { StreamsAppKibanaContext } from '../public/hooks/use_kibana';
import { StreamsTelemetryService } from '../public/telemetry/service';
import type { StreamsAppStartDependencies } from '../public/types';

export function getMockStreamsAppContext(): StreamsAppKibanaContext {
  const appParams = coreMock.createAppMountParameters();
  const core = coreMock.createStart();
  const coreSetup = coreMock.createSetup();

  const telemetryService = new StreamsTelemetryService();
  telemetryService.setup(coreSetup.analytics);

  const dataMock = dataPluginMock.createStartContract();

  const start = new Date(new Date().getTime() - 15 * 60 * 1000);
  const end = new Date();

  jest.spyOn(dataMock.query.timefilter.timefilter, 'useTimefilter').mockReturnValue({
    timeState: {
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
      asAbsoluteTimeRange: {
        from: start.toISOString(),
        to: end.toISOString(),
        mode: 'absolute',
      },
      start: start.getTime(),
      end: end.getTime(),
    },
    timeState$: new Subject(),
    refresh: jest.fn(),
  });

  jest.spyOn(core.pricing, 'isFeatureAvailable').mockReturnValue(true);

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
        fieldFormats: fieldFormatsServiceMock.createStartContract(),
        fieldsMetadata: fieldsMetadataPluginPublicMock.createStartContract(),
        licensing: licensingMock.createStart(),
        indexManagement: {},
        ingestPipelines: {},
        discoverShared: {},
        discover: {
          locator: {
            getRedirectUrl: () => '',
          },
        },
        observabilityAIAssistant: {
          service: {
            isEnabled: () => true,
          },
          useGenAIConnectors: () => {
            return {
              loading: false,
              selectedConnector: 'azure-gpt4o',
              connectors: [
                {
                  id: 'azure-gpt4o',
                  actionTypeId: '.gen-ai',
                  name: 'GPT-4o Azure',
                  config: {
                    apiUrl: '',
                    apiProvider: 'Azure OpenAI',
                  },
                },
              ],
            };
          },
        } as unknown as ObservabilityAIAssistantPublicStart,
        unifiedDocViewer: {} as unknown as UnifiedDocViewerStart,
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
      telemetryClient: telemetryService.getClient(),
      version: '1.0.0',
    },
    isServerless: false,
  };
}

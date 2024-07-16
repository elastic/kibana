/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { AssistantAvailability, AssistantProvider } from '@kbn/elastic-assistant';
import { I18nProvider } from '@kbn/i18n-react';
import { euiDarkVars } from '@kbn/ui-theme';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PartialTheme, Theme } from '@elastic/charts';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import numeral from '@elastic/numeral';

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { DataQualityProvider } from '../../data_quality_panel/data_quality_context';
import { ResultsRollupContext } from '../../contexts/results_rollup_context';
import { IndicesCheckContext } from '../../contexts/indices_check_context';
import { UseIndicesCheckReturnValue } from '../../use_indices_check/types';
import { UseResultsRollupReturnValue } from '../../use_results_rollup/types';
import { auditbeatWithAllResults } from '../pattern_rollup/mock_auditbeat_pattern_rollup';
import { EMPTY_STAT } from '../../helpers';
import { EcsFlatTyped } from '../../constants';
import { mockUnallowedValuesResponse } from '../unallowed_values/mock_unallowed_values';
import { mockMappingsResponse } from '../mappings_response/mock_mappings_response';
import {
  getMappingsProperties,
  getSortedPartitionedFieldMetadata,
} from '../../data_quality_panel/index_properties/helpers';
import { getUnallowedValues } from '../../use_unallowed_values/helpers';
import { getUnallowedValueRequestItems } from '../../data_quality_panel/allowed_values/helpers';
import { UnallowedValueSearchResult } from '../../types';

interface TestExternalProvidersProps {
  children: React.ReactNode;
}

window.scrollTo = jest.fn();

/** A utility for wrapping children in the providers required to run tests */
const TestExternalProvidersComponent: React.FC<TestExternalProvidersProps> = ({ children }) => {
  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockGetComments = jest.fn(() => []);
  const mockHttp = httpServiceMock.createStartContract({ basePath: '/test' });
  const mockNavigateToApp = jest.fn();
  const mockAssistantAvailability: AssistantAvailability = {
    hasAssistantPrivilege: false,
    hasConnectorsAllPrivilege: true,
    hasConnectorsReadPrivilege: true,
    hasUpdateAIAssistantAnonymization: true,
    isAssistantEnabled: true,
  };
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: () => {},
    },
  });

  return (
    <I18nProvider>
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <QueryClientProvider client={queryClient}>
          <AssistantProvider
            actionTypeRegistry={actionTypeRegistry}
            assistantAvailability={mockAssistantAvailability}
            augmentMessageCodeBlocks={jest.fn()}
            basePath={'https://localhost:5601/kbn'}
            docLinks={{
              ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
              DOC_LINK_VERSION: 'current',
            }}
            getComments={mockGetComments}
            http={mockHttp}
            baseConversations={{}}
            navigateToApp={mockNavigateToApp}
            currentAppId={'securitySolutionUI'}
          >
            {children}
          </AssistantProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};

TestExternalProvidersComponent.displayName = 'TestExternalProvidersComponent';

export const TestExternalProviders = React.memo(TestExternalProvidersComponent);

export interface TestDataQualityProvidersProps {
  children: React.ReactNode;
  dataQualityContextProps?: {
    isILMAvailable?: boolean;
    addSuccessToast?: (toast: { title: string }) => void;
    baseTheme?: Theme;
    canUserCreateAndReadCases?: () => boolean;
    endDate?: string | null;
    formatBytes?: (value: number | undefined) => string;
    formatNumber?: (value: number | undefined) => string;
    isAssistantEnabled?: boolean;
    lastChecked?: string;
    openCreateCaseFlyout?: ({
      comments,
      headerContent,
    }: {
      comments: string[];
      headerContent?: React.ReactNode;
    }) => void;
    patterns?: string[];
    setLastChecked?: (lastChecked: string) => void;
    startDate?: string | null;
    theme?: PartialTheme;
    ilmPhases?: string[];
    selectedIlmPhaseOptions?: EuiComboBoxOptionOption[];
    setSelectedIlmPhaseOptions?: (options: EuiComboBoxOptionOption[]) => void;
  };
  indicesCheckContextProps?: Partial<UseIndicesCheckReturnValue>;
  resultsRollupContextProps?: Partial<UseResultsRollupReturnValue>;
}

const TestDataQualityProvidersComponent: React.FC<TestDataQualityProvidersProps> = ({
  children,
  dataQualityContextProps,
  resultsRollupContextProps,
  indicesCheckContextProps,
}) => {
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });
  const { toasts } = notificationServiceMock.createSetupContract();
  const mockTelemetryEvents = {
    reportDataQualityIndexChecked: jest.fn(),
    reportDataQualityCheckAllCompleted: jest.fn(),
  };

  const {
    isILMAvailable,
    addSuccessToast,
    canUserCreateAndReadCases,
    endDate,
    formatBytes,
    formatNumber,
    isAssistantEnabled,
    lastChecked,
    openCreateCaseFlyout,
    patterns,
    setLastChecked,
    startDate,
    theme,
    baseTheme,
    ilmPhases,
    selectedIlmPhaseOptions,
    setSelectedIlmPhaseOptions,
  } = {
    isILMAvailable: true,
    addSuccessToast: jest.fn(),
    canUserCreateAndReadCases: jest.fn(() => true),
    endDate: null,
    formatBytes: (value: number | undefined) =>
      value != null ? numeral(value).format('0,0.[0]b') : EMPTY_STAT,
    formatNumber: (value: number | undefined) =>
      value != null ? numeral(value).format('0,0.[000]') : EMPTY_STAT,
    isAssistantEnabled: true,
    lastChecked: '2023-03-28T22:27:28.159Z',
    openCreateCaseFlyout: jest.fn(),
    patterns: ['auditbeat-*'],
    setLastChecked: jest.fn(),
    startDate: null,
    theme: {
      background: {
        color: '#000',
      },
    },
    baseTheme: {
      background: {
        color: '#000',
      },
    },
    ilmPhases: ['hot', 'warm', 'unmanaged'],
    selectedIlmPhaseOptions: [
      {
        label: 'hot',
        value: 'hot',
      },
      {
        label: 'warm',
        value: 'warm',
      },
      {
        label: 'unmanaged',
        value: 'unmanaged',
      },
    ],
    setSelectedIlmPhaseOptions: jest.fn(),
    ...dataQualityContextProps,
  };

  const mergedResultsRollupContextProps = {
    onCheckCompleted: jest.fn(),
    patternIndexNames: {
      'auditbeat-*': [
        '.ds-auditbeat-8.6.1-2023.02.07-000001',
        'auditbeat-custom-index-1',
        'auditbeat-custom-empty-index-1',
      ],
    },
    patternRollups: {
      'auditbeat-*': auditbeatWithAllResults,
    },
    totalDocsCount: 19127,
    totalIncompatible: 4,
    totalIndices: 3,
    totalIndicesChecked: 3,
    totalSameFamily: 0,
    totalSizeInBytes: 18820446,
    updatePatternIndexNames: jest.fn(),
    updatePatternRollup: jest.fn(),
    ...resultsRollupContextProps,
  };

  const mergedIndicesCheckContextProps: UseIndicesCheckReturnValue = {
    checkIndex: jest.fn(),
    checkState: {},
  };

  for (const key of Object.keys(mergedResultsRollupContextProps.patternIndexNames)) {
    for (const indexName of mergedResultsRollupContextProps.patternIndexNames[key]) {
      const mappingsProperties = getMappingsProperties({
        indexName,
        indexes: mockMappingsResponse as Record<string, IndicesGetMappingIndexMappingRecord>,
      });
      const unallowedValues = getUnallowedValues({
        requestItems: getUnallowedValueRequestItems({
          ecsMetadata: EcsFlatTyped,
          indexName,
        }),
        searchResults: mockUnallowedValuesResponse as unknown as UnallowedValueSearchResult[],
      });
      const partitionedFieldMetadata = getSortedPartitionedFieldMetadata({
        ecsMetadata: EcsFlatTyped,
        loadingMappings: false,
        mappingsProperties,
        unallowedValues,
      });
      mergedIndicesCheckContextProps.checkState[indexName] = {
        isChecking: false,
        isLoadingMappings: false,
        isLoadingUnallowedValues: false,
        indexes: mockMappingsResponse as Record<string, IndicesGetMappingIndexMappingRecord>,
        partitionedFieldMetadata,
        searchResults: mockUnallowedValuesResponse as unknown as UnallowedValueSearchResult[],
        unallowedValues,
        mappingsProperties,
        genericError: null,
        mappingsError: null,
        unallowedValuesError: null,
        isCheckComplete: true,
      };
    }
  }

  Object.assign(mergedIndicesCheckContextProps, indicesCheckContextProps);

  return (
    <DataQualityProvider
      httpFetch={http.fetch}
      toasts={toasts}
      isILMAvailable={isILMAvailable}
      telemetryEvents={mockTelemetryEvents}
      addSuccessToast={addSuccessToast}
      canUserCreateAndReadCases={canUserCreateAndReadCases}
      endDate={endDate}
      formatBytes={formatBytes}
      formatNumber={formatNumber}
      isAssistantEnabled={isAssistantEnabled}
      lastChecked={lastChecked}
      openCreateCaseFlyout={openCreateCaseFlyout}
      patterns={patterns}
      setLastChecked={setLastChecked}
      startDate={startDate}
      theme={theme}
      baseTheme={baseTheme as Theme}
      ilmPhases={ilmPhases}
      selectedIlmPhaseOptions={selectedIlmPhaseOptions}
      setSelectedIlmPhaseOptions={setSelectedIlmPhaseOptions}
    >
      <ResultsRollupContext.Provider value={mergedResultsRollupContextProps}>
        <IndicesCheckContext.Provider value={mergedIndicesCheckContextProps}>
          {children}
        </IndicesCheckContext.Provider>
      </ResultsRollupContext.Provider>
    </DataQualityProvider>
  );
};

TestDataQualityProvidersComponent.displayName = 'TestDataQualityProvidersComponent';
export const TestDataQualityProviders = React.memo(TestDataQualityProvidersComponent);

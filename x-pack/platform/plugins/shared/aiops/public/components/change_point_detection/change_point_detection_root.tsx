/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { pick } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UrlStateProvider } from '@kbn/ml-url-state';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  DatePickerContextProvider,
  type DatePickerDependencies,
  mlTimefilterRefresh$,
} from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { AIOPS_EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';

import { DataSourceContext } from '../../hooks/use_data_source';
import type { AiopsAppContextValue } from '../../hooks/use_aiops_app_context';
import { AiopsAppContext } from '../../hooks/use_aiops_app_context';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';

import { PageHeader } from '../page_header';

import { ChangePointDetectionPage } from './change_point_detection_page';
import {
  ChangePointDetectionContextProvider,
  ChangePointDetectionControlsContextProvider,
} from './change_point_detection_context';
import { timeSeriesDataViewWarning } from '../../application/utils/time_series_dataview_check';
import { ReloadContextProvider } from '../../hooks/use_reload';
import { FilterQueryContextProvider } from '../../hooks/use_filters_query';

const localStorage = new Storage(window.localStorage);

/**
 * Props for the ChangePointDetectionAppState component.
 */
export interface ChangePointDetectionAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | null;
  /** App context value */
  appContextValue: AiopsAppContextValue;
  /** Optional flag to indicate whether kibana is running in serverless */
  showFrozenDataTierChoice?: boolean;
}

export const ChangePointDetectionAppState: FC<ChangePointDetectionAppStateProps> = ({
  dataView,
  savedSearch,
  appContextValue,
  showFrozenDataTierChoice = true,
}) => {
  const datePickerDeps: DatePickerDependencies = {
    ...pick(appContextValue, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
    showFrozenDataTierChoice,
  };

  const warning = timeSeriesDataViewWarning(dataView, 'change_point_detection');

  const reload$ = useMemo<Observable<number>>(() => {
    return mlTimefilterRefresh$.pipe(map((v) => v.lastRefresh));
  }, []);

  if (warning !== null) {
    return <>{warning}</>;
  }

  appContextValue.embeddingOrigin = AIOPS_EMBEDDABLE_ORIGIN.ML_AIOPS_LABS;

  const CasesContext = appContextValue.cases?.ui.getCasesContext() ?? React.Fragment;
  const casesPermissions = appContextValue.cases?.helpers.canUseCases();

  return (
    <CasesContext owner={[]} permissions={casesPermissions!}>
      <AiopsAppContext.Provider value={appContextValue}>
        <UrlStateProvider>
          <DataSourceContext.Provider value={{ dataView, savedSearch }}>
            <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <PageHeader />
                <EuiSpacer />
                <ReloadContextProvider reload$={reload$}>
                  <FilterQueryContextProvider>
                    <ChangePointDetectionContextProvider>
                      <ChangePointDetectionControlsContextProvider>
                        <ChangePointDetectionPage />
                      </ChangePointDetectionControlsContextProvider>
                    </ChangePointDetectionContextProvider>
                  </FilterQueryContextProvider>
                </ReloadContextProvider>
              </DatePickerContextProvider>
            </StorageContextProvider>
          </DataSourceContext.Provider>
        </UrlStateProvider>
      </AiopsAppContext.Provider>
    </CasesContext>
  );
};

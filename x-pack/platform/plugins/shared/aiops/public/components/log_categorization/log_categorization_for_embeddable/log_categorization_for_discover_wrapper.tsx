/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Suspense } from 'react';
import { pick } from 'lodash';

import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { AIOPS_STORAGE_KEYS } from '../../../types/storage';
import { AiopsAppContext, type AiopsAppContextValue } from '../../../hooks/use_aiops_app_context';

import type { LogCategorizationEmbeddableProps } from './log_categorization_for_discover';
import { LogCategorizationDiscover } from './log_categorization_for_discover';

export interface LogCategorizationEmbeddableWrapperProps {
  appContextValue: AiopsAppContextValue;
  props: LogCategorizationEmbeddableProps;
}

const localStorage = new Storage(window.localStorage);

export const LogCategorizationDiscoverWrapper: FC<LogCategorizationEmbeddableWrapperProps> = ({
  appContextValue,
  props,
}) => {
  const I18nContext = appContextValue.i18n.Context;

  const datePickerDeps = {
    ...pick(appContextValue, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
    uiSettingsKeys: UI_SETTINGS,
  };

  return (
    <I18nContext>
      <AiopsAppContext.Provider value={appContextValue}>
        <DatePickerContextProvider {...datePickerDeps}>
          <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
            <Suspense fallback={null}>
              <LogCategorizationDiscover
                input={props.input}
                renderViewModeToggle={props.renderViewModeToggle}
              />
            </Suspense>
          </StorageContextProvider>
        </DatePickerContextProvider>
      </AiopsAppContext.Provider>
    </I18nContext>
  );
};

// eslint-disable-next-line import/no-default-export
export default LogCategorizationDiscoverWrapper;

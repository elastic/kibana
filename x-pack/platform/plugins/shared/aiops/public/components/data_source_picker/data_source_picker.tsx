/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiTitle } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { MlDataSourcePicker } from '@kbn/aiops-components';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

/**
 * Thin wrapper around `MlDataSourcePicker` that sources its services from
 * `AiopsAppContext`. Falls back to a static data-view title when the optional
 * services required by the picker (`dataViewFieldEditor`, `contentManagement`)
 * are not present in the context (e.g. embeddable / non-ML hosts).
 */
export const AiopsDataSourcePicker: FC<{ currentDataView: DataView | null }> = ({
  currentDataView,
}) => {
  const {
    data,
    dataViewEditor,
    dataViewFieldEditor,
    contentManagement,
    http,
    application,
    uiSettings,
  } = useAiopsAppContext();

  if (!dataViewFieldEditor || !contentManagement) {
    return currentDataView ? (
      <EuiTitle size="l">
        <h2>{currentDataView.getName()}</h2>
      </EuiTitle>
    ) : null;
  }

  return (
    <MlDataSourcePicker
      currentDataView={currentDataView}
      services={{
        dataViews: data.dataViews,
        dataViewEditor,
        dataViewFieldEditor,
        contentManagement,
        http,
        application,
        uiSettings,
      }}
      DataViewPickerComponent={DataViewPicker}
      SavedObjectFinderComponent={SavedObjectFinder}
    />
  );
};

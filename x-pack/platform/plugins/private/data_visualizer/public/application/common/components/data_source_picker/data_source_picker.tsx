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

import { useDataVisualizerKibana } from '../../../kibana_context';

/**
 * Thin wrapper around `MlDataSourcePicker` that sources its services from
 * the data_visualizer Kibana context. Falls back to a static data-view title
 * when the optional services required by the picker (`dataViewFieldEditor`,
 * `contentManagement`) are not present.
 */
export const DataVisualizerDataSourcePicker: FC<{
  currentDataView: DataView | null;
  onFieldSaved?: () => void;
}> = ({ currentDataView, onFieldSaved }) => {
  const { services } = useDataVisualizerKibana();
  const {
    data,
    dataViewEditor,
    dataViewFieldEditor,
    contentManagement,
    http,
    application,
    uiSettings,
  } = services;

  if (!dataViewFieldEditor || !contentManagement) {
    return currentDataView ? (
      <EuiTitle size="s">
        <h2 data-test-subj="mlDataDriftPageDataViewTitle">{currentDataView.getName()}</h2>
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
      onFieldSaved={onFieldSaved}
    />
  );
};

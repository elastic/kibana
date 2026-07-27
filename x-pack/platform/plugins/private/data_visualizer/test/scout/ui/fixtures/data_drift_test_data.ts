/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const farequoteKQLFiltersDataDriftTestData = {
  suiteTitle: 'KQL saved search and filters',
  isSavedSearch: true,
  dateTimeField: '@timestamp',
  sourceIndexOrSavedSearch: 'ft_farequote_filter_and_kuery',
  chartClickCoordinates: [0, 0] as [number, number],
  // Click relative to canvas center; must hit a histogram bar to create the brush.
  comparisonChartClickCoordinates: [0, 0] as [number, number],
  dataViewName: 'ft_farequote',
  totalDocCount: '5,674',
};

export const dataViewCreationTestData = {
  suiteTitle: 'from data view creation mode',
  isSavedSearch: true,
  dateTimeField: '@timestamp',
  chartClickCoordinates: [0, 0] as [number, number],
  comparisonChartClickCoordinates: [0, 0] as [number, number],
  totalDocCount: '86,274',
};

export const nonTimeSeriesTestData = {
  suiteTitle: 'from data view creation mode',
  isSavedSearch: false,
  dateTimeField: '@timestamp',
  sourceIndexOrSavedSearch: 'ft_ihp_outlier',
  dataViewName: 'ft_ihp_outlier',
};

export type DataDriftTestData =
  | typeof farequoteKQLFiltersDataDriftTestData
  | typeof dataViewCreationTestData
  | typeof nonTimeSeriesTestData;

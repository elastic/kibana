/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { DataDrift } from './data_drift';
import { DataVisualizerDataView } from './data_visualizer_data_view';
import { DataVisualizerSelector } from './data_visualizer_selector';
import { DataVisualizerTable } from './data_visualizer_table';
import { FileDataVisualizer } from './file_data_visualizer';
import { IndexDataVisualizer } from './index_data_visualizer';
import { JobSourceSelection } from './job_source_selection';
import { MlNavigation } from './ml_navigation';

export interface DataVisualizerPageObjects extends PageObjects {
  mlNavigation: MlNavigation;
  dataVisualizerSelector: DataVisualizerSelector;
  jobSourceSelection: JobSourceSelection;
  indexDataVisualizer: IndexDataVisualizer;
  dataVisualizerTable: DataVisualizerTable;
  fileDataVisualizer: FileDataVisualizer;
  dataVisualizerDataView: DataVisualizerDataView;
  dataDrift: DataDrift;
}

export const extendPageObjects = (
  pageObjects: PageObjects,
  page: ScoutPage
): DataVisualizerPageObjects => {
  const dataVisualizerTable = createLazyPageObject(DataVisualizerTable, page);

  return {
    ...pageObjects,
    mlNavigation: createLazyPageObject(MlNavigation, page),
    dataVisualizerSelector: createLazyPageObject(DataVisualizerSelector, page),
    jobSourceSelection: createLazyPageObject(JobSourceSelection, page),
    indexDataVisualizer: createLazyPageObject(IndexDataVisualizer, page),
    dataVisualizerTable,
    fileDataVisualizer: createLazyPageObject(FileDataVisualizer, page),
    dataVisualizerDataView: createLazyPageObject(DataVisualizerDataView, page, dataVisualizerTable),
    dataDrift: createLazyPageObject(DataDrift, page),
  };
};

export {
  DataDrift,
  DataVisualizerDataView,
  DataVisualizerSelector,
  DataVisualizerTable,
  FileDataVisualizer,
  IndexDataVisualizer,
  JobSourceSelection,
  MlNavigation,
};

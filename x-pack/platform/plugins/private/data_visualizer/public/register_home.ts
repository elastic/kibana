/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ResultLinks } from '@kbn/file-upload-common';
import type { CoreSetup } from '@kbn/core/public';

import { getFileDataVisualizerWrapper } from '@kbn/file-upload/src/file_upload_component/wrapper';
import {
  featureTitle,
  FILE_DATA_VIS_TAB_ID,
  applicationPath,
  featureId,
} from '../common/constants';
import { getFieldsStatsGrid } from './application/common/components/fields_stats_grid';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';

export function registerHomeAddData(
  getStartServices: CoreSetup<DataVisualizerStartDependencies>['getStartServices'],
  home: HomePublicPluginSetup,
  resultsLinks: ResultLinks
) {
  home.addData.registerAddDataTab({
    id: FILE_DATA_VIS_TAB_ID,
    name: i18n.translate('xpack.dataVisualizer.file.embeddedTabTitle', {
      defaultMessage: 'Upload file',
    }),
    getComponent: () =>
      getFileDataVisualizerWrapper(
        async () => {
          const [coreStart, deps] = await getStartServices();
          return {
            analytics: coreStart.analytics,
            application: coreStart.application,
            data: deps.data,
            fieldFormats: deps.fieldFormats,
            fileUpload: deps.fileUpload,
            http: coreStart.http,
            notifications: coreStart.notifications,
            share: deps.share,
            uiActions: deps.uiActions,
            uiSettings: coreStart.uiSettings,
            coreStart,
          };
        },
        'home-add-data',
        resultsLinks,
        getFieldsStatsGrid
      ),
  });
}

export function registerHomeFeatureCatalogue(home: HomePublicPluginSetup) {
  home.featureCatalogue.register({
    id: featureId,
    title: featureTitle,
    description: i18n.translate('xpack.dataVisualizer.description', {
      defaultMessage: 'Import your own CSV, NDJSON, or log file.',
    }),
    icon: 'document',
    path: applicationPath,
    showOnHomePage: true,
    category: 'data',
    order: 520,
  });
}

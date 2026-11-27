/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { FileUploadStartDependencies } from '@kbn/file-upload';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';

/** Builds the services the shared file upload UI needs from the data visualizer start dependencies. */
export const getFileUploadDependencies = (
  coreStart: CoreStart,
  plugins: DataVisualizerStartDependencies
): FileUploadStartDependencies => ({
  analytics: plugins.analytics,
  application: coreStart.application,
  data: plugins.data,
  fieldFormats: plugins.fieldFormats,
  fileUpload: plugins.fileUpload,
  http: coreStart.http,
  notifications: coreStart.notifications,
  share: plugins.share,
  uiActions: plugins.uiActions,
  uiSettings: coreStart.uiSettings,
  coreStart,
});

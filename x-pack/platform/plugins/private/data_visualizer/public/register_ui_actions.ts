/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { OPEN_FILE_UPLOAD_LITE_ACTION } from '@kbn/file-upload-common';
import { createOpenFileUploadLiteAction } from '@kbn/file-upload/src/file_upload_component/components/file_upload_lite_action';
import { OPEN_FILE_UPLOAD_LITE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';
import { getFileUploadDependencies } from './get_file_upload_dependencies';

export function registerUiActions(coreStart: CoreStart, plugins: DataVisualizerStartDependencies) {
  const { uiActions } = plugins;
  if (uiActions === undefined) {
    return;
  }

  const fileUploadPlugins = getFileUploadDependencies(coreStart, plugins);

  const categorizationADJobAction = createOpenFileUploadLiteAction(coreStart, fileUploadPlugins);
  uiActions.addTriggerActionAsync(
    OPEN_FILE_UPLOAD_LITE_TRIGGER,
    OPEN_FILE_UPLOAD_LITE_ACTION,
    async () => categorizationADJobAction
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { OPEN_FILE_UPLOAD_LITE_TRIGGER } from '@kbn/file-upload-common';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';
import {
  createOpenFileUploadLiteAction,
  createOpenFileUploadLiteTrigger,
} from './lite/file_upload_lite_action';

export function registerUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<DataVisualizerStartDependencies>
) {
  const categorizationADJobAction = createOpenFileUploadLiteAction(core.getStartServices);
  uiActions.registerTrigger(createOpenFileUploadLiteTrigger);
  uiActions.registerAction(categorizationADJobAction);
  uiActions.addTriggerAction(OPEN_FILE_UPLOAD_LITE_TRIGGER, categorizationADJobAction);
}

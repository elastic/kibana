/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';
import type { DataVisualizerStartDependencies } from './application/common/types/data_visualizer_plugin';
import {
  OPEN_FILE_UPLOAD_LITE_TRIGGER,
  createOpenFileUploadLiteAction,
  createOpenFileUploadLiteTrigger,
} from './lite/file_upload_lite_action';
import type { FileUploadResults } from './lite/flyout/create_flyout';

export interface OpenFileUploadLiteContext {
  onUploadComplete?: (results: FileUploadResults | null) => void;
  indexSettings?: IndicesIndexSettings;
  autoAddInference?: string;
}

export function registerUiActions(
  uiActions: UiActionsSetup,
  core: CoreSetup<DataVisualizerStartDependencies>
) {
  const categorizationADJobAction = createOpenFileUploadLiteAction(core.getStartServices);
  uiActions.registerTrigger(createOpenFileUploadLiteTrigger);
  uiActions.registerAction(categorizationADJobAction);
  uiActions.addTriggerAction(OPEN_FILE_UPLOAD_LITE_TRIGGER, categorizationADJobAction);
}

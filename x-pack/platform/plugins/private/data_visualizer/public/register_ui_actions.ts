/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import {
  OPEN_FILE_UPLOAD_LITE_ACTION,
  OPEN_FILE_UPLOAD_LITE_TRIGGER,
} from '@kbn/file-upload-common';
import type { FileUploadStartDependencies } from '@kbn/file-upload';
import { createOpenFileUploadLiteAction, createOpenFileUploadLiteTrigger } from '@kbn/file-upload';

export function registerUiActions(coreStart: CoreStart, plugins: FileUploadStartDependencies) {
  const { uiActions } = plugins;
  if (uiActions === undefined) {
    return;
  }

  const categorizationADJobAction = createOpenFileUploadLiteAction(coreStart, plugins);
  uiActions.registerTrigger(createOpenFileUploadLiteTrigger);
  uiActions.addTriggerActionAsync(
    OPEN_FILE_UPLOAD_LITE_TRIGGER,
    OPEN_FILE_UPLOAD_LITE_ACTION,
    async () => categorizationADJobAction
  );
}

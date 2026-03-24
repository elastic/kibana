/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { OPEN_FILE_UPLOAD_LITE_ACTION } from '@kbn/file-upload-common';

import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import { createFlyout } from './flyout/create_flyout';
import type { FileUploadStartDependencies } from '../kibana_context';

export function createOpenFileUploadLiteAction(
  coreStart: CoreStart,
  plugins: FileUploadStartDependencies
): UiActionsActionDefinition<OpenFileUploadLiteContext> {
  return {
    id: 'create-open-file-upload-lite-action',
    type: OPEN_FILE_UPLOAD_LITE_ACTION,
    getIconType(context): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.fileUpload.lite.actions.displayName', {
        defaultMessage: 'Open file upload UI',
      }),
    async execute({
      onUploadComplete,
      existingIndex,
      autoAddInference,
      autoCreateDataView,
      indexSettings,
      initialIndexName,
      flyoutContent,
      location,
    }: OpenFileUploadLiteContext) {
      try {
        createFlyout(coreStart, plugins, {
          onUploadComplete,
          existingIndex,
          autoAddInference,
          autoCreateDataView,
          indexSettings,
          initialIndexName,
          flyoutContent,
          location,
        });
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible() {
      return true;
    },
  };
}

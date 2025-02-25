/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Trigger, UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  OPEN_FILE_UPLOAD_LITE_ACTION,
  OPEN_FILE_UPLOAD_LITE_TRIGGER,
} from '@kbn/file-upload-common';

import type { OpenFileUploadLiteContext } from '@kbn/file-upload-common';
import type { DataVisualizerStartDependencies } from '../application/common/types/data_visualizer_plugin';
import { createFlyout } from './flyout/create_flyout';

export const createOpenFileUploadLiteTrigger: Trigger = {
  id: OPEN_FILE_UPLOAD_LITE_TRIGGER,
  title: i18n.translate('xpack.dataVisualizer.file.lite.actions.triggerTitle', {
    defaultMessage: 'Open file upload UI',
  }),
  description: i18n.translate('xpack.dataVisualizer.file.lite.actions.triggerDescription', {
    defaultMessage: 'Open file upload UI',
  }),
};

export function createOpenFileUploadLiteAction(
  coreStart: CoreStart,
  plugins: DataVisualizerStartDependencies
): UiActionsActionDefinition<OpenFileUploadLiteContext> {
  return {
    id: 'create-open-file-upload-lite-action',
    type: OPEN_FILE_UPLOAD_LITE_ACTION,
    getIconType(context): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.dataVisualizer.file.lite.actions.displayName', {
        defaultMessage: 'Open file upload UI',
      }),
    async execute({
      onUploadComplete,
      autoAddInference,
      autoCreateDataView,
      indexSettings,
    }: OpenFileUploadLiteContext) {
      try {
        const { share, data } = plugins;

        createFlyout(coreStart, share, data, {
          onUploadComplete,
          autoAddInference,
          autoCreateDataView,
          indexSettings,
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

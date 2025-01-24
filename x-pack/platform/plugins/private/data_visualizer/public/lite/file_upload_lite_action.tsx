/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Trigger, UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { CoreSetup } from '@kbn/core/public';
// import type { DataVisualizerCoreSetup } from '../plugin';
import {
  // OPEN_FILE_UPLOAD_LITE_ACTION,
  // OPEN_FILE_UPLOAD_LITE_TRIGGER,
  type OpenFileUploadLiteContext,
} from '../register_ui_actions';
import type { DataVisualizerStartDependencies } from '../application/common/types/data_visualizer_plugin';

export const OPEN_FILE_UPLOAD_LITE_ACTION = 'openFileUploadLiteTrigger';

export const OPEN_FILE_UPLOAD_LITE_TRIGGER = 'OPEN_FILE_UPLOAD_LITE_TRIGGER';

export const createOpenFileUploadLiteTrigger: Trigger = {
  id: OPEN_FILE_UPLOAD_LITE_TRIGGER,
  title: i18n.translate('xpack.ml.actions.createADJobFromPatternAnalysis', {
    defaultMessage: 'Create categorization anomaly detection job',
  }),
  description: i18n.translate('xpack.ml.actions.createADJobFromPatternAnalysis', {
    defaultMessage: 'Create categorization anomaly detection job',
  }),
};

export function createOpenFileUploadLiteAction(
  getStartServices: CoreSetup<DataVisualizerStartDependencies>['getStartServices']
): UiActionsActionDefinition<OpenFileUploadLiteContext> {
  return {
    id: 'create-open-file-upload-lite-action',
    type: OPEN_FILE_UPLOAD_LITE_ACTION,
    getIconType(context): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.createADJobFromPatternAnalysis', {
        defaultMessage: 'Create categorization anomaly detection job',
      }),
    async execute({
      onUploadComplete,
      autoAddInference,
      indexSettings,
    }: OpenFileUploadLiteContext) {
      try {
        const [{ showFlyout }, [coreStart, { share, data }]] = await Promise.all([
          import('./flyout/show_flyout'),
          getStartServices(),
        ]);

        await showFlyout(coreStart, share, data, {
          onUploadComplete,
          autoAddInference,
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

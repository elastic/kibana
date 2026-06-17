/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const pipelineEditorContextI18nTexts = {
  destinationScope: {
    processors: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.a11y.destinationScope.processors',
      { defaultMessage: 'Processors' }
    ),
    failureProcessors: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.a11y.destinationScope.failureProcessors',
      { defaultMessage: 'Failure processors' }
    ),
    failureHandlers: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.a11y.destinationScope.failureHandlers',
      { defaultMessage: 'Failure handlers' }
    ),
  },
  moveBefore: ({ targetProcessor }: { targetProcessor: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.a11y.moveBefore', {
      defaultMessage: 'before {targetProcessor} processor',
      values: { targetProcessor },
    }),
  moveAfter: ({ targetProcessor }: { targetProcessor: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.a11y.moveAfter', {
      defaultMessage: 'after {targetProcessor} processor',
      values: { targetProcessor },
    }),
  moveToStartWithScope: ({ scopeLabel }: { scopeLabel: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.a11y.moveToStartWithScope', {
      defaultMessage: 'to the start of {scopeLabel}',
      values: { scopeLabel },
    }),
  moveToStartEmptyWithScope: ({ scopeLabel }: { scopeLabel: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.a11y.moveToStartEmptyWithScope', {
      defaultMessage: 'to the start of {scopeLabel}',
      values: { scopeLabel },
    }),
  moveToEnd: () =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.a11y.moveToEnd', {
      defaultMessage: 'to the end',
    }),
  moveToNewPosition: () =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.a11y.moveToNewPosition', {
      defaultMessage: 'to a new position',
    }),
  moveSuccessWithScopeChange: ({
    processorType,
    sourceScope,
    destinationScope,
    destinationDescription,
  }: {
    processorType: string;
    sourceScope: string;
    destinationScope: string;
    destinationDescription: string;
  }) =>
    i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.a11y.moveProcessorSuccessWithScopeChange',
      {
        defaultMessage:
          '{processorType} processor has been moved from {sourceScope} to {destinationScope}, {destinationDescription}.',
        values: {
          processorType,
          sourceScope,
          destinationScope,
          destinationDescription,
        },
      }
    ),
  moveSuccess: ({
    processorType,
    destinationDescription,
  }: {
    processorType: string;
    destinationDescription: string;
  }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.a11y.moveProcessorSuccess', {
      defaultMessage: '{processorType} processor has been moved {destinationDescription}.',
      values: { processorType, destinationDescription },
    }),
};

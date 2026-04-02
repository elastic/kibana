/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ProcessorSelector } from '../../types';

const processorsSectionLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.sectionLabel.processors',
  {
    defaultMessage: 'Processors',
  }
);

const failureProcessorsSectionLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.sectionLabel.failureProcessors',
  {
    defaultMessage: 'Failure processors',
  }
);

const failureHandlersSectionLabel = i18n.translate(
  'xpack.ingestPipelines.pipelineEditor.sectionLabel.failureHandlers',
  {
    defaultMessage: 'Failure handlers',
  }
);

export const processorsTreeI18nTexts = {
  getSectionLabel: (baseSelector: ProcessorSelector) => {
    const root = baseSelector[0];
    return root === 'onFailure' ? failureProcessorsSectionLabel : processorsSectionLabel;
  },
  getSectionLabelForSelector: (selector: ProcessorSelector) => {
    const hasOnFailure = selector.includes('onFailure');
    if (!hasOnFailure) return processorsSectionLabel;
    const firstOnFailure = selector.indexOf('onFailure');
    const isNestedOnFailure = selector.indexOf('onFailure', firstOnFailure + 1) !== -1;
    return firstOnFailure === 0 && !isNestedOnFailure
      ? failureProcessorsSectionLabel
      : failureHandlersSectionLabel;
  },
  moveToEmptyTreeLabel: ({
    movingProcessor,
    sectionLabel,
  }: {
    movingProcessor: string;
    sectionLabel: string;
  }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.dropZoneButton.moveToEmptyTreeLabel', {
      defaultMessage: 'Move {movingProcessor} processor to the start of {sectionLabel}',
      values: { movingProcessor, sectionLabel },
    }),
};

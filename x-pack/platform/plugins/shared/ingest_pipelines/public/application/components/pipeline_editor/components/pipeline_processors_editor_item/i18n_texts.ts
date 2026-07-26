/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const i18nTexts = {
  moveButtonLabelWithName: ({ processorName }: { processorName: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.item.moveButtonLabelWithName', {
      defaultMessage: 'Move {processorName} processor',
      values: { processorName },
    }),
  editButtonLabel: i18n.translate('xpack.ingestPipelines.pipelineEditor.item.editButtonAriaLabel', {
    defaultMessage: 'Edit this processor',
  }),
  duplicateButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreMenu.duplicateButtonLabel',
    {
      defaultMessage: 'Duplicate this processor',
    }
  ),
  addOnFailureButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreMenu.addOnFailureHandlerButtonLabel',
    {
      defaultMessage: 'Add on failure handler',
    }
  ),
  cancelMoveButtonLabelWithName: ({ processorName }: { processorName: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.item.cancelMoveButtonAriaLabelWithName', {
      defaultMessage: 'Cancel move {processorName} processor',
      values: { processorName },
    }),
  deleteButtonLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreMenu.deleteButtonLabel',
    {
      defaultMessage: 'Delete',
    }
  ),
  moreButtonAriaLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.moreButtonAriaLabel',
    {
      defaultMessage: 'Show more actions for this processor',
    }
  ),
  processorTypeLabel: ({ type }: { type: string }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.item.textInputAriaLabel', {
      defaultMessage: 'Provide a description for this {type} processor',
      values: { type },
    }),
  descriptionPlaceholder: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.item.descriptionPlaceholder',
    { defaultMessage: 'No description' }
  ),
  dropZoneMoveBeforeLabel: ({
    movingProcessor,
    targetProcessor,
    section,
  }: {
    movingProcessor: string;
    targetProcessor: string;
    section: string;
  }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.dropZoneButton.moveBeforeLabel', {
      defaultMessage: 'Move {movingProcessor} before {targetProcessor} in {section}',
      values: { movingProcessor, targetProcessor, section },
    }),
  dropZoneCannotMoveBeforeLabel: ({
    movingProcessor,
    targetProcessor,
    section,
  }: {
    movingProcessor: string;
    targetProcessor: string;
    section: string;
  }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.dropZoneButton.cannotMoveBefore', {
      defaultMessage: 'Cannot move {movingProcessor} before {targetProcessor} in {section}',
      values: { movingProcessor, targetProcessor, section },
    }),
  dropZoneMoveAfterLabel: ({
    movingProcessor,
    targetProcessor,
    section,
  }: {
    movingProcessor: string;
    targetProcessor: string;
    section: string;
  }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.dropZoneButton.moveAfterLabel', {
      defaultMessage: 'Move {movingProcessor} after {targetProcessor} in {section}',
      values: { movingProcessor, targetProcessor, section },
    }),
  dropZoneCannotMoveAfterLabel: ({
    movingProcessor,
    targetProcessor,
    section,
  }: {
    movingProcessor: string;
    targetProcessor: string;
    section: string;
  }) =>
    i18n.translate('xpack.ingestPipelines.pipelineEditor.dropZoneButton.cannotMoveAfter', {
      defaultMessage: 'Cannot move {movingProcessor} after {targetProcessor} in {section}',
      values: { movingProcessor, targetProcessor, section },
    }),
};

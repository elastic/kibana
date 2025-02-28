/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverlayModalConfirmOptions, OverlayStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { fromPromise } from 'xstate5';

export interface ConfirmPromptActorInput extends OverlayModalConfirmOptions {
  message: string;
}

export function createConfirmPromptActor({ overlays }: { overlays: OverlayStart }) {
  return fromPromise<boolean, ConfirmPromptActorInput>(async ({ input }) => {
    const { message, ...options } = input;
    const hasConfirmed = await overlays.openConfirm(message, {
      buttonColor: 'danger',
      ...options,
    });

    return hasConfirmed || Promise.reject(hasConfirmed);
  });
}

export const discardChangesPromptInput: ConfirmPromptActorInput = {
  message: i18n.translate('xpack.streams.enrichment.processor.discardChanges.message', {
    defaultMessage: 'Are you sure you want to discard your changes?',
  }),
  title: i18n.translate('xpack.streams.enrichment.processor.discardChanges.title', {
    defaultMessage: 'Discard changes?',
  }),
  confirmButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.discardChanges.confirmButtonText',
    { defaultMessage: 'Discard' }
  ),
  cancelButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.discardChanges.cancelButtonText',
    { defaultMessage: 'Keep editing' }
  ),
};

export const deleteProcessorPromptInput: ConfirmPromptActorInput = {
  message: i18n.translate('xpack.streams.enrichment.processor.deleteProcessor.message', {
    defaultMessage: 'Deleting this processor will permanently impact the field configuration.',
  }),
  title: i18n.translate('xpack.streams.enrichment.processor.deleteProcessor.title', {
    defaultMessage: 'Are you sure you want to delete this processor?',
  }),
  confirmButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.deleteProcessor.confirmButtonText',
    { defaultMessage: 'Delete processor' }
  ),
  cancelButtonText: i18n.translate(
    'xpack.streams.enrichment.processor.deleteProcessor.cancelButtonText',
    { defaultMessage: 'Cancel' }
  ),
};

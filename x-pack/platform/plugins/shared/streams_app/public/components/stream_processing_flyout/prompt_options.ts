/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DiscardPromptOptions } from '../../hooks/use_discard_confirm';

export const discardProcessorChangesPromptOptions: DiscardPromptOptions = {
  message: i18n.translate('xpack.streams.processingFlyout.discardProcessor.message', {
    defaultMessage: 'Are you sure you want to discard your changes?',
  }),
  title: i18n.translate('xpack.streams.processingFlyout.discardProcessor.title', {
    defaultMessage: 'Discard changes?',
  }),
  confirmButtonText: i18n.translate('xpack.streams.processingFlyout.discardProcessor.confirm', {
    defaultMessage: 'Discard',
  }),
  cancelButtonText: i18n.translate('xpack.streams.processingFlyout.discardProcessor.cancel', {
    defaultMessage: 'Keep editing',
  }),
};

export const discardProcessingChangesPromptOptions: DiscardPromptOptions = {
  message: i18n.translate('xpack.streams.processingFlyout.discardProcessing.message', {
    defaultMessage: 'Your processing changes have not been saved and applied yet.',
  }),
  title: i18n.translate('xpack.streams.processingFlyout.discardProcessing.title', {
    defaultMessage: 'Discard unsaved processing changes?',
  }),
  confirmButtonText: i18n.translate('xpack.streams.processingFlyout.discardProcessing.confirm', {
    defaultMessage: 'Discard changes',
  }),
  cancelButtonText: i18n.translate('xpack.streams.processingFlyout.discardProcessing.cancel', {
    defaultMessage: 'Keep editing',
  }),
};

export const deleteProcessorPromptOptions: DiscardPromptOptions = {
  message: i18n.translate('xpack.streams.processingFlyout.deleteProcessor.message', {
    defaultMessage: 'The processor is removed from this processing when you save and apply.',
  }),
  title: i18n.translate('xpack.streams.processingFlyout.deleteProcessor.title', {
    defaultMessage: 'Are you sure you want to delete this processor?',
  }),
  confirmButtonText: i18n.translate('xpack.streams.processingFlyout.deleteProcessor.confirm', {
    defaultMessage: 'Delete processor',
  }),
  cancelButtonText: i18n.translate('xpack.streams.processingFlyout.deleteProcessor.cancel', {
    defaultMessage: 'Cancel',
  }),
};

export const deleteAllProcessorsPromptOptions: DiscardPromptOptions = {
  message: i18n.translate('xpack.streams.processingFlyout.deleteAllProcessors.message', {
    defaultMessage:
      'All processors are removed from this processing when you save and apply, and the processing node is removed from the map.',
  }),
  title: i18n.translate('xpack.streams.processingFlyout.deleteAllProcessors.title', {
    defaultMessage: 'Are you sure you want to delete all processors?',
  }),
  confirmButtonText: i18n.translate('xpack.streams.processingFlyout.deleteAllProcessors.confirm', {
    defaultMessage: 'Delete all processors',
  }),
  cancelButtonText: i18n.translate('xpack.streams.processingFlyout.deleteAllProcessors.cancel', {
    defaultMessage: 'Cancel',
  }),
};

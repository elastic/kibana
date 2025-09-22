/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DiscardPromptOptions } from '../../../../../../hooks/use_discard_confirm';

export const discardChangesPromptOptions: DiscardPromptOptions = {
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

// NOTE: Message is added dynamically as it contains the child count
export const deleteConditionPromptOptions: Omit<DiscardPromptOptions, 'message'> = {
  title: i18n.translate('xpack.streams.enrichment.condition.deleteCondition.title', {
    defaultMessage: 'Are you sure you want to delete this condition?',
  }),
  confirmButtonText: i18n.translate(
    'xpack.streams.enrichment.condition.deleteCondition.confirmButtonText',
    { defaultMessage: 'Delete condition' }
  ),
  cancelButtonText: i18n.translate(
    'xpack.streams.enrichment.condition.deleteCondition.cancelButtonText',
    { defaultMessage: 'Cancel' }
  ),
};

// NOTE: Message is added dynamically as it contains the child count
export const saveConditionPromptOptions: Omit<DiscardPromptOptions, 'message'> = {
  title: i18n.translate('xpack.streams.enrichment.condition.saveCondition.title', {
    defaultMessage: 'Update this item',
  }),
  confirmButtonText: i18n.translate(
    'xpack.streams.enrichment.condition.saveCondition.confirmButtonText',
    { defaultMessage: 'Update' }
  ),
  cancelButtonText: i18n.translate(
    'xpack.streams.enrichment.condition.saveCondition.cancelButtonText',
    { defaultMessage: 'Cancel' }
  ),
};

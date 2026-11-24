/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DiscardPromptOptions } from '../../hooks/use_discard_confirm';

export const discardRoutingChangesPromptOptions: DiscardPromptOptions = {
  message: i18n.translate('xpack.streams.routingFlyout.discardRouting.message', {
    defaultMessage: 'Your routing changes have not been applied to the map yet.',
  }),
  title: i18n.translate('xpack.streams.routingFlyout.discardRouting.title', {
    defaultMessage: 'Discard routing changes?',
  }),
  confirmButtonText: i18n.translate('xpack.streams.routingFlyout.discardRouting.confirm', {
    defaultMessage: 'Discard changes',
  }),
  cancelButtonText: i18n.translate('xpack.streams.routingFlyout.discardRouting.cancel', {
    defaultMessage: 'Keep editing',
  }),
};

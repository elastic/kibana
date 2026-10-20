/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';

const COPY_LINK_FAILED = i18n.translate(
  'xpack.agenticInvestigations.conversationTemplate.copyLinkFailed',
  { defaultMessage: 'Could not copy the link' }
);

/**
 * Copies the link and returns whether it worked. Only a failure is reported here: the flyout's
 * button confirms success in its own tooltip.
 */
export const copyLink = (toasts: NotificationsStart['toasts'], link: string): boolean => {
  const copied = copyToClipboard(link);
  if (!copied) {
    toasts.addDanger(COPY_LINK_FAILED);
  }
  return copied;
};

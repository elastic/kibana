/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RecommendedAction } from './investigation';

export const CONVERSATION_QUEUE_LABELS: Record<RecommendedAction, string> = Object.freeze({
  respond: i18n.translate('xpack.alertzero.conversationQueue.bucket.respond', {
    defaultMessage: 'Respond',
  }),
  investigate: i18n.translate('xpack.alertzero.conversationQueue.bucket.investigate', {
    defaultMessage: 'Investigate',
  }),
  configure: i18n.translate('xpack.alertzero.conversationQueue.bucket.configure', {
    defaultMessage: 'Configure',
  }),
  closed: i18n.translate('xpack.alertzero.conversationQueue.bucket.closed', {
    defaultMessage: 'Closed',
  }),
});

export const CONVERSATION_QUEUE_CATEGORIES: ReadonlyArray<{
  id: RecommendedAction;
  label: string;
}> = Object.freeze([
  { id: 'respond', label: CONVERSATION_QUEUE_LABELS.respond },
  { id: 'investigate', label: CONVERSATION_QUEUE_LABELS.investigate },
  { id: 'configure', label: CONVERSATION_QUEUE_LABELS.configure },
  { id: 'closed', label: CONVERSATION_QUEUE_LABELS.closed },
]);

/**
 * Queue bucket → the colour its count badge carries, severity-ordered from
 * "act now" down to `closed`, which stays uncoloured: a decision already made
 * is not work, so it must not compete with the buckets that still need someone.
 *
 * Constrained to names `EuiBadge` recognises: its `color` prop is typed
 * `BadgeColor | string`, so an unknown name type-checks and then falls through
 * to the custom-CSS-colour path at runtime, where it fails validation and
 * renders an unstyled badge. `configure` is `primary` to match the trend
 * chart card for the same category; `hollow` is the badge's uncoloured default.
 */
export const CONVERSATION_CATEGORY_COLORS: Record<
  RecommendedAction,
  'danger' | 'warning' | 'primary' | 'hollow'
> = {
  respond: 'danger',
  investigate: 'warning',
  configure: 'primary',
  closed: 'hollow',
};

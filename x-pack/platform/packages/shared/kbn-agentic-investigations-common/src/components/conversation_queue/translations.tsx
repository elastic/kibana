/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_CONVERSATION_QUEUE = Object.freeze({
  emptyQueue: i18n.translate('xpack.alertzero.conversationQueue.emptyBucket', {
    defaultMessage: 'No events in this category.',
  }),
  emptyQueueWithFilter: i18n.translate('xpack.alertzero.conversationQueue.emptyBucketWithFilter', {
    defaultMessage: 'No events match the current filter.',
  }),
});

export const CONVERSATION_QUEUE_ERROR = Object.freeze({
  title: i18n.translate('xpack.alertzero.conversationQueue.loadErrorTitle', {
    defaultMessage: 'Unable to load events',
  }),
  body: i18n.translate('xpack.alertzero.conversationQueue.loadErrorBody', {
    defaultMessage: 'Something went wrong while fetching events for this category.',
  }),
  retry: i18n.translate('xpack.alertzero.conversationQueue.loadErrorRetry', {
    defaultMessage: 'Try again',
  }),
  /** Beside the rows that did load, so it cannot read as the whole queue failing. */
  loadMore: i18n.translate('xpack.alertzero.conversationQueue.loadMoreError', {
    defaultMessage: 'Could not load more events.',
  }),
});

export const LOADING_CONVERSATION_QUEUE = i18n.translate(
  'xpack.alertzero.conversationQueue.loadingBucket',
  { defaultMessage: 'Loading events…' }
);

export const CONVERSATION_QUEUE_COUNT_LOADING = i18n.translate(
  'xpack.alertzero.conversationQueue.countLoading',
  { defaultMessage: 'Loading count' }
);

export const showMoreLabel = (count: number) =>
  i18n.translate('xpack.alertzero.conversationQueue.showMore', {
    defaultMessage: 'Show more ({count})',
    values: { count },
  });

/** Every bucket renders a Show more, so the accessible name has to say which one. */
export const showMoreAriaLabel = (bucket: string, count: number) =>
  i18n.translate('xpack.alertzero.conversationQueue.showMoreAriaLabel', {
    // Opens with the visible label verbatim, which WCAG 2.5.3 requires for voice control.
    defaultMessage: 'Show more ({count}) in {bucket}',
    values: { bucket, count },
  });

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WATCH_STATE_COMMENTS: { [key: string]: string } = {
  OK: '',

  PARTIALLY_THROTTLED: i18n.translate(
    'xpack.watcher.constants.watchStateComments.partiallyThrottledStateCommentText',
    {
      defaultMessage: 'Partially throttled',
    }
  ),

  THROTTLED: i18n.translate(
    'xpack.watcher.constants.watchStateComments.throttledStateCommentText',
    {
      defaultMessage: 'Throttled',
    }
  ),

  PARTIALLY_ACKNOWLEDGED: i18n.translate(
    'xpack.watcher.constants.watchStateComments.partiallyAcknowledgedStateCommentText',
    {
      defaultMessage: 'Partially acknowledged',
    }
  ),

  ACKNOWLEDGED: i18n.translate(
    'xpack.watcher.constants.watchStateComments.acknowledgedStateCommentText',
    {
      defaultMessage: 'Acknowledged',
    }
  ),

  FAILING: i18n.translate(
    'xpack.watcher.constants.watchStateComments.executionFailingStateCommentText',
    {
      defaultMessage: 'Execution failing',
    }
  ),
};

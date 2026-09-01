/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { notificationIdSchema } from '../../common/notification_schema';
import type { NotificationUnreadCount } from '../../common/types';
import { getNotificationDataStreamClient } from '../storage/notification_data_stream';
import { NOTIFICATION_QUERY_RESULT_LIMIT, type NotificationQueryDeps } from './query_notifications';
import { isReadAt, type NotificationReadState } from './read_state';

const unreadCountSourceSchema = z.object({
  notification_id: notificationIdSchema,
  '@timestamp': z.iso.datetime(),
});

/** Count unread notification representatives within the bounded list result set. */
export const queryUnreadCount = async (
  { dataStreams, logger }: NotificationQueryDeps,
  readState: NotificationReadState
): Promise<NotificationUnreadCount> => {
  const client = await getNotificationDataStreamClient(dataStreams);
  const response = await client.search({
    _source: ['notification_id', '@timestamp'],
    collapse: { field: 'notification_id' },
    sort: [{ '@timestamp': 'desc' }, { notification_id: 'asc' }],
    size: NOTIFICATION_QUERY_RESULT_LIMIT,
    track_total_hits: false,
  });

  let unreadCount = 0;
  const malformedIds: string[] = [];
  for (const hit of response.hits.hits.slice(0, NOTIFICATION_QUERY_RESULT_LIMIT)) {
    const parsed = unreadCountSourceSchema.safeParse(hit._source);
    if (!parsed.success) {
      malformedIds.push(hit._id ?? 'unknown');
      continue;
    }
    const notification = parsed.data;
    if (!isReadAt(readState, notification.notification_id, notification['@timestamp'])) {
      unreadCount += 1;
    }
  }

  if (malformedIds.length) {
    logger.debug(
      `Dropped ${
        malformedIds.length
      } malformed notification docs from unread count. Sample: ${malformedIds
        .slice(0, 10)
        .join(', ')}`
    );
  }

  return { unreadCount };
};

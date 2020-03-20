/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PartialAlert } from '../../../../../../../plugins/alerting/server';
import { readNotifications } from './read_notifications';
import { UpdateNotificationParams } from './types';
import { addTags } from './add_tags';
import { createNotifications } from './create_notifications';

export const updateNotifications = async ({
  alertsClient,
  actions,
  enabled,
  id,
  ruleId,
  ruleAlertId,
  name,
  tags,
  interval,
}: UpdateNotificationParams): Promise<PartialAlert | null> => {
  const notification = await readNotifications({ alertsClient, id, ruleId });

  if (interval && notification) {
    const result = await alertsClient.update({
      id: notification.id,
      data: {
        tags: addTags(tags, ruleId),
        name,
        schedule: {
          interval,
        },
        actions,
        params: {
          ruleId,
          ruleAlertId,
        },
        throttle: null,
      },
    });
    return result;
  }

  if (interval && !notification) {
    const result = await createNotifications({
      alertsClient,
      enabled,
      tags,
      name,
      interval,
      actions,
      ruleId,
      ruleAlertId,
    });
    return result;
  }

  if (!interval && notification) {
    await alertsClient.delete({ id: notification.id });
    return null;
  }

  return null;
};

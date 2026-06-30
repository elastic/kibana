/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { UserIdAndName, UserMessageEvent } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';

export const createUserMessageEvent = ({
  message,
  user,
  attachment_refs,
  timestamp = new Date().toISOString(),
  id = uuidv4(),
}: {
  message: string;
  user: UserIdAndName;
  attachment_refs?: AttachmentVersionRef[];
  timestamp?: string;
  id?: string;
}): UserMessageEvent => ({
  id,
  timestamp,
  type: TimelineEventType.user_message,
  user,
  message,
  ...(attachment_refs !== undefined && { attachment_refs }),
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { NotificationService, NotifyArgs } from './types';
import { ReportingCore } from '../..';
import { getContentStream } from '../../lib';

export interface Attachment {
  content: string;
  contentType?: string;
  encoding?: string;
  filename: string;
}

export class EmailNotificationService implements NotificationService {
  private readonly notifications: NotificationsPluginStart;

  constructor({ notifications }: { notifications: NotificationsPluginStart }) {
    this.notifications = notifications;
  }

  private async getAttachments(
    reporting: ReportingCore,
    index: string,
    id: string,
    jobType: string,
    contentType?: string | null
  ): Promise<Attachment[]> {
    const stream = await getContentStream(reporting, { id, index });
    const buffers: Buffer[] = [];
    for await (const chunk of stream) {
      buffers.push(chunk);
    }
    const content = Buffer.concat(buffers);

    let extension = 'pdf';
    if (jobType.toLowerCase().includes('png')) {
      extension = 'png';
    }

    return [
      {
        content: content.toString('base64'),
        ...(contentType ? { contentType } : {}),
        filename: `report.${extension}`,
        encoding: 'base64',
      },
    ];
  }

  public async notify({ reporting, index, id, contentType, jobType, emailParams }: NotifyArgs) {
    const attachments = await this.getAttachments(reporting, index, id, jobType, contentType);
    const { to, bcc, cc, subject, spaceId } = emailParams;
    const message = "Here's your report!";
    await this.notifications.getEmailService().sendAttachmentEmail({
      to,
      bcc,
      cc,
      subject,
      message,
      attachments,
      spaceId: spaceId ?? DEFAULT_SPACE_ID,
    });
  }
}

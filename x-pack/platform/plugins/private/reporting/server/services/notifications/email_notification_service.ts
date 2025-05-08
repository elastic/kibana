/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { ReportSource } from '@kbn/reporting-common/types';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { NotificationService, NotifyArgs } from './types';

export interface Attachment {
  content: string;
  contentType?: string;
  encoding?: string;
  filename: string;
}

export class EmailNotificationService implements NotificationService {
  private readonly logger: Logger;
  private readonly notifications: NotificationsPluginStart;

  constructor({
    logger,
    notifications,
  }: {
    logger: Logger;
    notifications: NotificationsPluginStart;
  }) {
    this.logger = logger;
    this.notifications = notifications;
  }

  private async getAttachments(
    esClient: ElasticsearchClient,
    index: string,
    id: string
  ): Promise<Attachment[]> {
    const { _source: report } = await esClient.get<ReportSource>({
      index,
      id,
    });

    if (report && report.output?.content && report.output?.content_type) {
      const content = report.output.content;
      const contentType = report.output.content_type;

      let extension = 'pdf';
      if (report.jobtype.toLowerCase().includes('png')) {
        extension = 'png';
      }

      return [{ content, contentType, filename: `report.${extension}`, encoding: 'base64' }];
    }

    return [];
  }

  public async notify({ esClient, index, id, to, bcc, cc, runAt, spaceId }: NotifyArgs) {
    try {
      if (!this.notifications.isEmailServiceAvailable()) {
        this.logger.warn('Could not send report. Email service is not available.');
        return;
      }
      const subject = `Scheduled report for ${runAt}`;
      const message = "Here's your report!";
      const attachments = await this.getAttachments(esClient, index, id);
      await this.notifications.getEmailService().sendAttachmentEmail({
        to,
        bcc,
        cc,
        subject,
        message,
        attachments,
        spaceId: spaceId ?? DEFAULT_SPACE_ID,
      });
    } catch (error) {
      this.logger.warn(`Error sending scheduled report: ${error.message}`);
    }
  }
}

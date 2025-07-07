/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { notificationsMock } from '@kbn/notifications-plugin/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { set } from '@kbn/safer-lodash-set';
import { ReportingCore } from '../..';
import { createMockReportingCore } from '../../test_helpers';
import { EmailNotificationService } from './email_notification_service';

describe('EmailNotificationService', () => {
  const notifications = notificationsMock.createStart();
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let emailNotificationService: EmailNotificationService;
  let mockCore: ReportingCore;

  beforeEach(async () => {
    jest.clearAllMocks();
    notifications.isEmailServiceAvailable.mockReturnValue(true);
    emailNotificationService = new EmailNotificationService({
      notifications,
    });
    const reportingConfig = {
      index: '.reporting-test',
      queue: { indexInterval: 'week' },
      statefulSettings: { enabled: true },
    };
    mockCore = await createMockReportingCore(createMockConfigSchema(reportingConfig));
    mockEsClient = (await mockCore.getEsClient()).asInternalUser as typeof mockEsClient;
  });

  it('notify()', async () => {
    const base64Content = Buffer.from('test-output').toString('base64');
    mockEsClient.search.mockResponse(
      set<any>({}, 'hits.hits.0._source', {
        jobtype: 'pdf',
        output: {
          content: base64Content,
          size: 12,
        },
      })
    );
    await emailNotificationService.notify({
      reporting: mockCore,
      index: '.reporting-test-1234',
      id: '1234',
      filename: 'test-report.pdf',
      contentType: 'test-content-type',
      relatedObject: {
        id: 'report-so-id',
        type: 'scheduled-report',
        namespace: 'space1',
      },
      emailParams: {
        to: ['test@test.com'],
        subject: 'Scheduled report for 04/18/2025',
        spaceId: 'space1',
      },
    });
    expect(notifications.getEmailService().sendAttachmentEmail).toHaveBeenCalledWith({
      attachments: [
        {
          content: 'dGVzdC1vdXRwdXR0ZXN0LW91dHB1dA==',
          contentType: 'test-content-type',
          encoding: 'base64',
          filename: 'test-report.pdf',
        },
      ],
      context: {
        relatedObjects: [
          {
            id: 'report-so-id',
            namespace: 'space1',
            type: 'scheduled-report',
          },
        ],
      },
      message: 'Your scheduled report is attached for you to download or share.',
      spaceId: 'space1',
      subject: 'Scheduled report for 04/18/2025',
      to: ['test@test.com'],
    });
  });

  it('throws an error when the email service is not available', async () => {
    notifications.isEmailServiceAvailable.mockReturnValue(false);

    await expect(
      emailNotificationService.notify({
        reporting: mockCore,
        index: '.reporting-test-1234',
        id: '1234',
        filename: 'test-report.pdf',
        contentType: 'test-content-type',
        relatedObject: {
          id: 'report-so-id',
          type: 'scheduled-report',
          namespace: 'space1',
        },
        emailParams: {
          to: ['test@test.com'],
          subject: 'Scheduled report for 04/18/2025',
          spaceId: 'space1',
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Email notification service is not available"`);

    expect(notifications.getEmailService().sendAttachmentEmail).not.toHaveBeenCalled();
  });
});

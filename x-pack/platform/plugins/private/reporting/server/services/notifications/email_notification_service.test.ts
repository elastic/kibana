/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { notificationsMock } from '@kbn/notifications-plugin/server/mocks';
import type { ReportDocument } from '@kbn/reporting-common/types';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { createMockReportingCore } from '../../test_helpers';
import { EmailNotificationService } from './email_notification_service';

describe('EmailNotificationService', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const notifications = notificationsMock.createStart();
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let emailNotificationService: EmailNotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    notifications.isEmailServiceAvailable.mockReturnValue(true);
    emailNotificationService = new EmailNotificationService({
      logger: mockLogger,
      notifications,
    });
    const reportingConfig = {
      index: '.reporting-test',
      queue: { indexInterval: 'week' },
      statefulSettings: { enabled: true },
    };
    const mockCore = await createMockReportingCore(createMockConfigSchema(reportingConfig));
    mockEsClient = (await mockCore.getEsClient()).asInternalUser as typeof mockEsClient;
    mockEsClient.get.mockResponse({} as any);
  });

  it('notify()', async () => {
    const mockReport = {
      _id: '1234',
      _index: '.reporting-test-1234',
      _primary_term: 1,
      _seq_no: 1,
      _source: {
        jobtype: 'test-report',
        output: {
          content: 'test output',
          content_type: 'test content_type',
        },
      },
    } as ReportDocument;
    mockEsClient.get.mockResponse(mockReport as any);
    await emailNotificationService.notify({
      esClient: mockEsClient,
      index: '.reporting-test-1234',
      id: '1234',
      to: ['test@test.com'],
      runAt: '04/18/2025',
      spaceId: 'space1',
    });

    expect(notifications.getEmailService().sendAttachmentEmail).toHaveBeenCalledWith({
      attachments: [
        {
          content: 'test output',
          contentType: 'test content_type',
          encoding: 'base64',
          filename: 'report.pdf',
        },
      ],
      message: "Here's your report!",
      spaceId: 'space1',
      subject: 'Scheduled report for 04/18/2025',
      to: ['test@test.com'],
    });
  });
});

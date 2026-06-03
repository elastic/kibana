/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { lazyObject } from '@kbn/lazy-object';
import type { EmailService } from './services';
import type { NotificationsServerStart } from './types';
import type { NotificationsPlugin } from './plugin';

const emailServiceMock: jest.Mocked<EmailService> = lazyObject({
  sendPlainTextEmail: jest.fn(),
  sendHTMLEmail: jest.fn(),
  sendAttachmentEmail: jest.fn(),
});

const createEmailServiceMock = () => {
  return emailServiceMock;
};

const startMock: jest.Mocked<NotificationsServerStart> = lazyObject({
  isEmailServiceAvailable: jest.fn(),
  getEmailService: jest.fn(createEmailServiceMock),
});

const createStartMock = () => {
  return startMock;
};

const notificationsPluginMock: jest.Mocked<PublicMethodsOf<NotificationsPlugin>> = lazyObject({
  setup: jest.fn(),
  start: jest.fn(createStartMock) as jest.Mock<NotificationsServerStart>,
  stop: jest.fn(),
});

const createNotificationsPluginMock = () => {
  return notificationsPluginMock;
};

export const notificationsMock = {
  createNotificationsPlugin: createNotificationsPluginMock,
  createEmailService: createEmailServiceMock,
  createStart: createStartMock,
  clear: () => {
    emailServiceMock.sendPlainTextEmail.mockClear();
    emailServiceMock.sendHTMLEmail.mockClear();
    startMock.getEmailService.mockClear();
    startMock.isEmailServiceAvailable.mockClear();
    notificationsPluginMock.setup.mockClear();
    notificationsPluginMock.start.mockClear();
    notificationsPluginMock.stop.mockClear();
  },
};

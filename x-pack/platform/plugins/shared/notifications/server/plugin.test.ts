/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { NotificationsConfigType } from './config';
import { NotificationsPlugin } from './plugin';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { EmailServiceProvider } from './services/connectors_email_service_provider';
import { EmailServiceStart } from './services';

jest.mock('./services/connectors_email_service_provider');

const emailServiceProviderMock = EmailServiceProvider as jest.MockedClass<
  typeof EmailServiceProvider
>;

const validConnectorConfig = {
  connectors: {
    default: {
      email: 'validConnectorId',
    },
  },
};

const createNotificationsPlugin = (config: NotificationsConfigType) => {
  const context = coreMock.createPluginInitializerContext<NotificationsConfigType>(config);
  const plugin = new NotificationsPlugin(context);
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();

  const actionsSetup = actionsMock.createSetup();
  actionsSetup.isPreconfiguredConnector.mockImplementationOnce(
    (connectorId) => connectorId === 'validConnectorId'
  );
  const pluginSetup = {
    actions: actionsSetup,
    licensing: licensingMock.createSetup(),
  };

  const actionsStart = actionsMock.createStart();
  const pluginStart = {
    actions: actionsStart,
    licensing: licensingMock.createStart(),
  };

  return {
    context,
    logger: context.logger.get(),
    plugin,
    coreSetup,
    coreStart,
    actionsSetup,
    pluginSetup,
    actionsStart,
    pluginStart,
  };
};

describe('Notifications Plugin', () => {
  beforeEach(() => emailServiceProviderMock.mockClear());

  it('should create an EmailServiceProvider passing in the configuration and logger from the initializer context', () => {
    const { logger } = createNotificationsPlugin(validConnectorConfig);
    expect(emailServiceProviderMock).toHaveBeenCalledTimes(1);
    expect(emailServiceProviderMock).toHaveBeenCalledWith(validConnectorConfig, logger);
  });

  describe('setup()', () => {
    it('should call setup() on the created EmailServiceProvider, passing in the setup plugin dependencies', () => {
      const { plugin, coreSetup, pluginSetup } = createNotificationsPlugin(validConnectorConfig);
      plugin.setup(coreSetup, pluginSetup);
      expect(emailServiceProviderMock.mock.instances[0].setup).toHaveBeenCalledTimes(1);
      expect(emailServiceProviderMock.mock.instances[0].setup).toBeCalledWith(pluginSetup);
    });
  });

  describe('start()', () => {
    it('should call start() on the created EmailServiceProvider, passing in the setup plugin dependencies', () => {
      const { plugin, coreStart, pluginStart } = createNotificationsPlugin(validConnectorConfig);
      plugin.start(coreStart, pluginStart);
      expect(emailServiceProviderMock.mock.instances[0].start).toHaveBeenCalledTimes(1);
      expect(emailServiceProviderMock.mock.instances[0].start).toBeCalledWith(pluginStart);
    });

    it('should return EmailServiceProvider.start() contract as part of its contract', () => {
      const { plugin, coreStart, pluginStart } = createNotificationsPlugin(validConnectorConfig);

      const emailStart: EmailServiceStart = {
        getEmailService: jest.fn(),
        isEmailServiceAvailable: jest.fn(),
      };

      const providerMock = emailServiceProviderMock.mock
        .instances[0] as jest.Mocked<EmailServiceProvider>;
      providerMock.start.mockReturnValue(emailStart);
      const start = plugin.start(coreStart, pluginStart);
      expect(emailServiceProviderMock.mock.instances[0].start).toHaveBeenCalledTimes(1);
      expect(emailServiceProviderMock.mock.instances[0].start).toBeCalledWith(pluginStart);
      expect(start).toEqual(expect.objectContaining(emailStart));
    });
  });
});

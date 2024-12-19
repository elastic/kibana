/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { LicensedEmailService } from './licensed_email_service';
import { EmailServiceProvider } from './connectors_email_service_provider';
import { ConnectorsEmailService } from './connectors_email_service';
import { PLUGIN_ID } from '../../common';

jest.mock('./licensed_email_service');
jest.mock('./connectors_email_service');

const licensedEmailServiceMock = LicensedEmailService as jest.MockedClass<
  typeof LicensedEmailService
>;
const connectorsEmailServiceMock = ConnectorsEmailService as jest.MockedClass<
  typeof ConnectorsEmailService
>;

const missingConnectorConfig = {
  connectors: {
    default: {},
  },
};

const invalidConnectorConfig = {
  connectors: {
    default: {
      email: 'someUnexistingConnectorId',
    },
  },
};

const validConnectorConfig = {
  connectors: {
    default: {
      email: 'validConnectorId',
    },
  },
};

describe('ConnectorsEmailServiceProvider', () => {
  const logger = loggerMock.create();
  const actionsSetup = actionsMock.createSetup();
  actionsSetup.isPreconfiguredConnector.mockImplementation(
    (connectorId) => connectorId === 'validConnectorId'
  );

  beforeEach(() => {
    loggerMock.clear(logger);
    licensedEmailServiceMock.mockClear();
    connectorsEmailServiceMock.mockClear();
  });

  it('implements the IEmailServiceProvider interface', () => {
    const serviceProvider = new EmailServiceProvider(validConnectorConfig, loggerMock.create());
    expect(serviceProvider.setup).toBeInstanceOf(Function);
    expect(serviceProvider.start).toBeInstanceOf(Function);
  });

  describe('setup()', () => {
    it('should log a warning if Actions or Licensing plugins are not available', () => {
      const serviceProvider = new EmailServiceProvider(validConnectorConfig, logger);
      serviceProvider.setup({
        actions: actionsSetup,
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Email Service Error: 'actions' and 'licensing' plugins are required.`
      );
      // eslint-disable-next-line dot-notation
      expect(serviceProvider['setupSuccessful']).toEqual(false);
    });

    it('should log an info message if no default email connector has been defined', () => {
      const serviceProvider = new EmailServiceProvider(missingConnectorConfig, logger);
      serviceProvider.setup({
        actions: actionsSetup,
        licensing: licensingMock.createSetup(),
      });

      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        `Email Service Error: Email connector not specified.`
      );
      // eslint-disable-next-line dot-notation
      expect(serviceProvider['setupSuccessful']).toEqual(false);
    });

    it('should log a warning if the specified email connector is not a preconfigured connector', () => {
      const serviceProvider = new EmailServiceProvider(invalidConnectorConfig, logger);
      serviceProvider.setup({
        actions: actionsSetup,
        licensing: licensingMock.createSetup(),
      });

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `Email Service Error: Unexisting email connector 'someUnexistingConnectorId' specified.`
      );
      // eslint-disable-next-line dot-notation
      expect(serviceProvider['setupSuccessful']).toEqual(false);
    });

    it('should not log a warning if required plugins are present and the specified email connector is valid', () => {
      const serviceProvider = new EmailServiceProvider(validConnectorConfig, logger);
      serviceProvider.setup({
        actions: actionsSetup,
        licensing: licensingMock.createSetup(),
      });

      expect(logger.warn).not.toHaveBeenCalled();
      // eslint-disable-next-line dot-notation
      expect(serviceProvider['setupSuccessful']).toEqual(true);
    });
  });

  describe('start()', () => {
    it('returns an object that implements the EmailServiceStart contract', () => {
      const serviceProvider = new EmailServiceProvider(missingConnectorConfig, logger);
      const start = serviceProvider.start({});
      expect(start.getEmailService).toBeInstanceOf(Function);
      expect(start.isEmailServiceAvailable).toBeInstanceOf(Function);
    });

    describe('if setup has not been run', () => {
      it('the start contract methods fail accordingly', () => {
        const serviceProvider = new EmailServiceProvider(missingConnectorConfig, logger);
        const start = serviceProvider.start({});
        expect(start.isEmailServiceAvailable()).toEqual(false);
        expect(() => {
          start.getEmailService();
        }).toThrowErrorMatchingInlineSnapshot(`"Email Service Error: setup() has not been run"`);
      });
    });

    describe('if setup() did not complete successfully', () => {
      it('the start contract methods fail accordingly', () => {
        const serviceProvider = new EmailServiceProvider(invalidConnectorConfig, logger);
        serviceProvider.setup({
          actions: actionsSetup,
          licensing: licensingMock.createSetup(),
        });
        const start = serviceProvider.start({
          actions: actionsMock.createStart(),
          licensing: licensingMock.createStart(),
        });
        expect(start.isEmailServiceAvailable()).toEqual(false);
        expect(() => {
          start.getEmailService();
        }).toThrowErrorMatchingInlineSnapshot(
          `"Email Service Error: Unexisting email connector 'someUnexistingConnectorId' specified."`
        );
      });
    });

    describe('if setup() did complete successfully and Action and Licensing plugin start contracts are available', () => {
      it('attempts to build an UnsecuredActionsClient', () => {
        const serviceProvider = new EmailServiceProvider(validConnectorConfig, logger);
        const actionsStart = actionsMock.createStart();

        serviceProvider.setup({
          actions: actionsSetup,
          licensing: licensingMock.createSetup(),
        });
        serviceProvider.start({
          actions: actionsStart,
          licensing: licensingMock.createStart(),
        });
        expect(actionsStart.getUnsecuredActionsClient).toHaveBeenCalledTimes(1);
      });

      describe('if getUnsecuredActionsClient() throws an Exception', () => {
        it('catches the exception, and the start contract methods fail accordingly', () => {
          const serviceProvider = new EmailServiceProvider(validConnectorConfig, logger);
          const actionsStart = actionsMock.createStart();
          actionsStart.getUnsecuredActionsClient.mockImplementation(() => {
            throw new Error('Something went terribly wrong.');
          });

          serviceProvider.setup({
            actions: actionsSetup,
            licensing: licensingMock.createSetup(),
          });
          const start = serviceProvider.start({
            actions: actionsStart,
            licensing: licensingMock.createStart(),
          });

          expect(start.isEmailServiceAvailable()).toEqual(false);
          expect(() => {
            start.getEmailService();
          }).toThrowErrorMatchingInlineSnapshot(
            `"Email Service Error: Something went terribly wrong."`
          );
        });
      });

      describe('if getUnsecuredActionsClient() returns an UnsecuredActionsClient', () => {
        it('returns a start contract that provides valid EmailService', () => {
          const serviceProvider = new EmailServiceProvider(validConnectorConfig, logger);
          const licensingStart = licensingMock.createStart();
          const actionsStart = actionsMock.createStart();

          serviceProvider.setup({
            actions: actionsSetup,
            licensing: licensingMock.createSetup(),
          });
          const start = serviceProvider.start({
            actions: actionsStart,
            licensing: licensingStart,
          });

          expect(start.isEmailServiceAvailable()).toEqual(true);
          const email = start.getEmailService();
          expect(email).toBeInstanceOf(LicensedEmailService);
          expect(licensedEmailServiceMock).toHaveBeenCalledTimes(1);

          expect(licensedEmailServiceMock).toHaveBeenCalledWith(
            connectorsEmailServiceMock.mock.instances[0],
            licensingStart.license$,
            'platinum',
            expect.objectContaining({ debug: expect.any(Function), warn: expect.any(Function) })
          );

          expect(connectorsEmailServiceMock).toHaveBeenCalledTimes(1);
          expect(connectorsEmailServiceMock).toHaveBeenCalledWith(
            PLUGIN_ID,
            validConnectorConfig.connectors.default.email,
            actionsStart.getUnsecuredActionsClient(),
            logger
          );
        });
      });
    });
  });
});

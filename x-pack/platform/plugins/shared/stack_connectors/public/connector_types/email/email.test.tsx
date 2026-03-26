/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { emailServices, getEmailServices } from './email';
import type { ValidatedEmail, ValidateEmailAddressesOptions } from '@kbn/actions-plugin/common';
import { InvalidEmailReason, MustacheInEmailRegExp } from '@kbn/actions-plugin/common';
import { experimentalFeaturesMock } from '../../mocks';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';
import { serviceParamValueToKbnSettingMap } from '@kbn/connector-schemas/email/constants';

const CONNECTOR_TYPE_ID = '.email';
let connectorTypeModel: ConnectorTypeModel;

const RegistrationServices = {
  validateEmailAddresses: validateEmails,
};

// stub for the real validator
function validateEmails(
  addresses: string[],
  options?: ValidateEmailAddressesOptions
): ValidatedEmail[] {
  return addresses.map((address) => {
    if (address.includes('invalid'))
      return { address, valid: false, reason: InvalidEmailReason.invalid };
    else if (address.includes('notallowed'))
      return { address, valid: false, reason: InvalidEmailReason.notAllowed };
    else if (options?.treatMustacheTemplatesAsValid) return { address, valid: true };
    else if (address.match(MustacheInEmailRegExp))
      return { address, valid: false, reason: InvalidEmailReason.invalid };
    else return { address, valid: true };
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

beforeAll(() => {
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: RegistrationServices });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.iconClass).toEqual('email');
  });
});

describe('getEmailServices', () => {
  test('should return elastic cloud service if isCloudEnabled is true', () => {
    const services = getEmailServices(true, ['*']);
    expect(services.find((service) => service.value === 'elastic_cloud')).toBeTruthy();
  });

  test('should not return elastic cloud service if isCloudEnabled is false', () => {
    const services = getEmailServices(false, ['*']);
    expect(services.find((service) => service.value === 'elastic_cloud')).toBeFalsy();
  });

  test('should return all services if enabledEmailsServices is *', () => {
    const services = getEmailServices(true, ['*']);
    expect(services).toEqual(emailServices);
  });

  test('should return only specified services if enabledEmailsServices is not empty', () => {
    const services = getEmailServices(true, [
      serviceParamValueToKbnSettingMap.gmail,
      serviceParamValueToKbnSettingMap.outlook365,
    ]);

    expect(services).toEqual([
      {
        ['kbn-setting-value']: 'google-mail',
        text: 'Gmail',
        value: 'gmail',
      },
      {
        ['kbn-setting-value']: 'microsoft-outlook',
        text: 'Outlook',
        value: 'outlook365',
      },
    ]);
  });

  test('should return enabled services and the current service if specified', () => {
    const services = getEmailServices(
      true,
      [serviceParamValueToKbnSettingMap.gmail, serviceParamValueToKbnSettingMap.outlook365],
      serviceParamValueToKbnSettingMap.other
    );

    expect(services).toEqual([
      {
        ['kbn-setting-value']: 'google-mail',
        text: 'Gmail',
        value: 'gmail',
      },
      {
        ['kbn-setting-value']: 'microsoft-outlook',
        text: 'Outlook',
        value: 'outlook365',
      },
      {
        ['kbn-setting-value']: 'other',
        text: 'Other',
        value: 'other',
      },
    ]);
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      to: [],
      cc: ['test1@test.com'],
      bcc: ['mustache {{\n}} template'],
      message: 'message {test}',
      subject: 'test',
    };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        message: [],
        subject: [],
      },
    });
  });

  test('action params validation fails when action params is not valid', async () => {
    const actionParams = {
      to: ['invalid.com'],
      cc: ['bob@notallowed.com'],
      bcc: ['another-invalid.com'],
      subject: 'test',
    };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: {
        to: ['Email address invalid.com is not valid.'],
        cc: ['Email address bob@notallowed.com is not allowed.'],
        bcc: ['Email address another-invalid.com is not valid.'],
        replyTo: [],
        message: ['Message is required.'],
        subject: [],
      },
    });
  });

  test('action params validation succeeds when replyTo is provided and valid', async () => {
    const actionParams = {
      to: ['bob@example.com'],
      cc: ['cc@example.com'],
      bcc: [],
      replyTo: ['reply@example.com'],
      message: 'message',
      subject: 'test',
    };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        message: [],
        subject: [],
      },
    });
  });

  test('action params validation fails when replyTo is invalid', async () => {
    const actionParams = {
      to: ['bob@example.com'],
      cc: ['cc@example.com'],
      bcc: [],
      replyTo: ['invalidEmail'],
      message: 'message',
      subject: 'test',
    };

    expect(await connectorTypeModel.validateParams(actionParams, null)).toEqual({
      errors: {
        to: [],
        cc: [],
        bcc: [],
        replyTo: ['Email address invalidEmail is not valid.'],
        message: [],
        subject: [],
      },
    });
  });
});

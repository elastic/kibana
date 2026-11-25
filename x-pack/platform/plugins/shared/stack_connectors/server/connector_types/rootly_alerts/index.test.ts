/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import type { ActionParamsType } from '@kbn/connector-schemas/rootly_alerts';
import type { RootlyAlertsConnectorType } from '.';
import { getConnectorType, getRetryAfter, getServiceMessage, redactSecret } from '.';

jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => ({
  request: jest.fn(),
}));

const requestMock = request as jest.Mock;
const services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

const webhookUrl = 'https://rootly.example.com/webhooks/incoming/generic_webhooks';

let connectorType: RootlyAlertsConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;
let connectorUsageCollector: ConnectorUsageCollector;

beforeEach(() => {
  jest.clearAllMocks();
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
  connectorUsageCollector = new ConnectorUsageCollector({
    logger: mockedLogger,
    connectorId: 'test-connector-id',
  });
  requestMock.mockResolvedValue({ status: 200, headers: {}, data: {} });
});

describe('get()', () => {
  test('should return correct connector type', () => {
    expect(connectorType.id).toEqual('.rootly_alerts');
    expect(connectorType.name).toEqual('Rootly Alerts');
    expect(connectorType.minimumLicenseRequired).toEqual('gold');
    expect(connectorType.supportedFeatureIds).toEqual(['alerting', 'siem']);
  });
});

describe('validateConfig()', () => {
  const validateConfig = (url: string) =>
    connectorType.validate.config.customValidator?.(
      { webhookUrl: url },
      { configurationUtilities }
    );

  test('should validate and pass when the webhook URL is valid', () => {
    expect(() => validateConfig(webhookUrl)).not.toThrow();
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(webhookUrl);
  });

  test('should validate and throw error when the webhook URL is not a URL', () => {
    expect(() => validateConfig('not a url')).toThrowErrorMatchingInlineSnapshot(
      `"error configuring rootly alerts action: unable to parse host name from webhookUrl"`
    );
  });

  test('should validate and throw error when the webhook URL includes the secret', () => {
    expect(() => validateConfig(`${webhookUrl}?secret=abc`)).toThrowErrorMatchingInlineSnapshot(
      `"error configuring rootly alerts action: webhookUrl must not include the secret"`
    );
  });

  test('should validate and throw error when the webhook URL is not in allowedHosts', () => {
    configurationUtilities.ensureUriAllowed.mockImplementation(() => {
      throw new Error('target url is not added to allowedHosts');
    });
    expect(() => validateConfig(webhookUrl)).toThrowErrorMatchingInlineSnapshot(
      `"error configuring rootly alerts action: target url is not added to allowedHosts"`
    );
  });
});

describe('execute()', () => {
  const trigger: ActionParamsType = {
    event: 'trigger',
    dedupKey: 'rule:alert',
    title: 'Error count is high',
  };

  const execute = (params: ActionParamsType) =>
    connectorType.executor({
      actionId: 'some-action-id',
      config: { webhookUrl },
      secrets: { secret: 'super-secret' },
      params,
      services,
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

  test('should post the event with the secret as a bearer token', async () => {
    const result = await execute({ ...trigger, match: { on: 'service', value: 'checkout-api' } });

    expect(requestMock).toHaveBeenCalledTimes(1);
    const { url, method, headers, data } = requestMock.mock.calls[0][0];
    expect(url).toBe(webhookUrl);
    expect(method).toBe('post');
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer super-secret',
    });
    expect(data).toMatchObject({
      event: 'trigger',
      dedup_key: 'rule:alert',
      title: 'Error count is high',
      service: 'checkout-api',
    });
    expect(result).toEqual({
      status: 'ok',
      actionId: 'some-action-id',
      data: { dedupKey: 'rule:alert' },
    });
  });

  test('should use the rule and alert IDs when a trigger from a rule has no dedupKey', async () => {
    const result = await execute({ title: 'Test alert', ruleId: 'rule', alertId: 'alert' });

    expect(requestMock.mock.calls[0][0].data.dedup_key).toBe('rule:alert');
    expect(result.data).toEqual({ dedupKey: 'rule:alert' });
  });

  test('should generate a dedupKey when a trigger has none', async () => {
    const result = await execute({ title: 'Test alert' });

    const { data } = requestMock.mock.calls[0][0];
    expect(data.dedup_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(result).toEqual({
      status: 'ok',
      actionId: 'some-action-id',
      data: { dedupKey: data.dedup_key },
    });
  });

  test('should post only the event and dedupKey on resolve', async () => {
    await execute({ event: 'resolve', dedupKey: 'rule:alert' });

    expect(requestMock.mock.calls[0][0].data).toEqual({
      event: 'resolve',
      dedup_key: 'rule:alert',
    });
  });

  test.each([200, 201, 202])('should succeed on http status %s', async (status) => {
    requestMock.mockResolvedValue({ status, headers: {}, data: {} });

    expect((await execute(trigger)).status).toBe('ok');
  });

  test('should fail without retry on an unexpected status', async () => {
    requestMock.mockResolvedValue({
      status: 404,
      headers: {},
      data: { errors: [{ title: 'integration cannot be found', status: '404' }] },
    });

    expect(await execute(trigger)).toEqual({
      status: 'error',
      actionId: 'some-action-id',
      message: 'error posting rootly alerts event: unexpected status 404',
      serviceMessage: 'integration cannot be found',
    });
  });

  test.each([429, 500, 503])('should fail with retry on http status %s', async (status) => {
    requestMock.mockResolvedValue({ status, headers: {}, data: {} });

    expect(await execute(trigger)).toEqual({
      status: 'error',
      actionId: 'some-action-id',
      message: `error posting rootly alerts event: http status ${status}, retry later`,
      serviceMessage: undefined,
      retry: true,
    });
  });

  test('should retry at the time in the retry-after header', async () => {
    requestMock.mockResolvedValue({ status: 429, headers: { 'retry-after': '30' }, data: {} });

    const before = Date.now();
    const { retry } = await execute(trigger);
    expect(retry).toBeInstanceOf(Date);
    expect((retry as Date).getTime()).toBeGreaterThanOrEqual(before + 30000);
  });

  test('should keep the secret out of the error from Rootly', async () => {
    requestMock.mockResolvedValue({
      status: 401,
      headers: {},
      data: { error: 'token super-secret is not valid' },
    });

    expect((await execute(trigger)).serviceMessage).toBe('token [REDACTED] is not valid');
  });

  test('should keep the secret out of a thrown error', async () => {
    requestMock.mockRejectedValue(new Error('bad header Bearer super-secret'));

    expect((await execute(trigger)).serviceMessage).toBe('bad header Bearer [REDACTED]');
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'error thrown posting rootly alerts event: bad header Bearer [REDACTED]'
    );
  });

  test('should fail when the request throws', async () => {
    requestMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    expect(await execute(trigger)).toMatchObject({
      status: 'error',
      actionId: 'some-action-id',
      message: 'error posting rootly alerts event',
      serviceMessage: 'connect ECONNREFUSED',
    });
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'error thrown posting rootly alerts event: connect ECONNREFUSED'
    );
  });
});

describe('getRetryAfter()', () => {
  test('should read a number of seconds', () => {
    const before = Date.now();
    const retry = getRetryAfter({ 'retry-after': '30' }) as Date;
    expect(retry.getTime()).toBeGreaterThanOrEqual(before + 30000);
    expect(retry.getTime()).toBeLessThanOrEqual(Date.now() + 30000);
  });

  test('should read a large number of seconds', () => {
    const retry = getRetryAfter({ 'retry-after': '100000' }) as Date;
    expect(retry.getTime()).toBeGreaterThan(Date.now() + 99000 * 1000);
  });

  test('should read an HTTP date', () => {
    expect(getRetryAfter({ 'retry-after': 'Wed, 21 Oct 2071 07:28:00 GMT' })).toEqual(
      new Date('2071-10-21T07:28:00Z')
    );
  });

  test.each([undefined, '', 'soon', '-1', '0x10', '1.5', '1e3', '2071-10-21', '9'.repeat(20)])(
    'should return true for %s',
    (retryAfter) => {
      expect(getRetryAfter({ 'retry-after': retryAfter })).toBe(true);
    }
  );
});

describe('redactSecret()', () => {
  test('should replace every copy of the secret', () => {
    expect(redactSecret('abc and abc', 'abc')).toBe('[REDACTED] and [REDACTED]');
    expect(redactSecret('nothing here', 'abc')).toBe('nothing here');
    expect(redactSecret(undefined, 'abc')).toBeUndefined();
  });
});

describe('renderParameterTemplates()', () => {
  const variables = { rule: { name: 'CPU "high" on C:\\host\nline two' }, context: { value: 7 } };
  const render = (params: ActionParamsType) =>
    connectorType.renderParameterTemplates!(mockedLogger, params, variables);

  test('should render fields as they are and escape values in custom details', () => {
    const rendered = render({
      title: '{{rule.name}}',
      labels: [{ key: 'value', value: '{{context.value}}' }],
      customDetails: '{"rule":"{{rule.name}}"}',
    });

    expect(rendered.title).toBe(variables.rule.name);
    expect(rendered.labels).toEqual([{ key: 'value', value: '7' }]);
    expect(JSON.parse(rendered.customDetails!)).toEqual({ rule: variables.rule.name });
  });

  test('should leave custom details out when there are none', () => {
    expect(render({ title: '{{rule.name}}' })).toEqual({ title: variables.rule.name });
  });
});

describe('getServiceMessage()', () => {
  test('should read the first error title or the error', () => {
    expect(getServiceMessage({ errors: [{ title: 'integration cannot be found' }] })).toBe(
      'integration cannot be found'
    );
    expect(getServiceMessage({ error: 'title is required' })).toBe('title is required');
  });

  test.each([null, '<html>', {}, { errors: [] }, { error: 42 }])(
    'should return undefined for %j',
    (data) => {
      expect(getServiceMessage(data)).toBeUndefined();
    }
  );
});

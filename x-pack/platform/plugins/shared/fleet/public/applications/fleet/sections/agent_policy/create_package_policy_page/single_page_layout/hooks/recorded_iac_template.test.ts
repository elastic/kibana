/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sendUpdateCloudConnector,
  sendVerifyCloudConnectorIacKey,
} from '../../../../../../../hooks/use_request/cloud_connector';

import { persistRecordedIacTemplate, toRecordedIacTemplate } from './recorded_iac_template';

jest.mock('../../../../../../../hooks/use_request/cloud_connector', () => ({
  sendUpdateCloudConnector: jest.fn(),
  sendVerifyCloudConnectorIacKey: jest.fn(),
}));

const mockUpdate = jest.mocked(sendUpdateCloudConnector);
const mockVerify = jest.mocked(sendVerifyCloudConnectorIacKey);

const guardDutyIntegrations = [
  { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }] },
];
const guardDutyKey =
  '[{"name":"aws","policyTemplates":[{"name":"guardduty","enabledInputs":["httpjson"]}]}]';
const recorded = toRecordedIacTemplate(
  {
    iac_key: 'sha256:updated-template',
    iac_blueprint_id: 'aws/workload_identity_federation',
    iac_blueprint_version: '1.4.0',
  },
  { cloudConnectorId: 'connector-1', integrations: guardDutyIntegrations }
);

describe('persistRecordedIacTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ data: {}, error: null } as any);
    mockVerify.mockResolvedValue({ data: {}, error: null } as any);
  });

  it('writes the template details to the saved identity, then re-checks it', async () => {
    const onError = jest.fn();

    await persistRecordedIacTemplate({
      recorded,
      cloudConnectorId: 'connector-1',
      integrationsKey: guardDutyKey,
      onError,
    });

    expect(mockUpdate).toHaveBeenCalledWith('connector-1', {
      iac_key: 'sha256:updated-template',
      iac_blueprint_id: 'aws/workload_identity_federation',
      iac_blueprint_version: '1.4.0',
    });
    expect(mockVerify).toHaveBeenCalledWith('connector-1', {});
    expect(onError).not.toHaveBeenCalled();
  });

  it.each([
    ['nothing was launched', undefined, 'connector-1', guardDutyKey],
    ['the policy saved a different identity', recorded, 'connector-2', guardDutyKey],
    ['the policy saved without an identity', recorded, undefined, guardDutyKey],
    [
      'the enabled inputs changed after the launch',
      recorded,
      'connector-1',
      '[{"name":"aws","policyTemplates":[{"name":"guardduty","enabledInputs":["aws-s3","httpjson"]}]}]',
    ],
  ])(
    'writes nothing when %s',
    async (_case, recordedTemplate, cloudConnectorId, integrationsKey) => {
      await persistRecordedIacTemplate({
        recorded: recordedTemplate,
        cloudConnectorId,
        integrationsKey,
        onError: jest.fn(),
      });

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockVerify).not.toHaveBeenCalled();
    }
  );

  it('reports a failed write once and does not re-check', async () => {
    const failure = new Error('connector update failed');
    mockUpdate.mockResolvedValue({ data: undefined, error: failure } as any);
    const onError = jest.fn();

    await persistRecordedIacTemplate({
      recorded,
      cloudConnectorId: 'connector-1',
      integrationsKey: guardDutyKey,
      onError,
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('reports a write that throws and still resolves', async () => {
    mockUpdate.mockRejectedValue(new Error('network down'));
    const onError = jest.fn();

    await expect(
      persistRecordedIacTemplate({
        recorded,
        cloudConnectorId: 'connector-1',
        integrationsKey: guardDutyKey,
        onError,
      })
    ).resolves.toBeUndefined();

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('treats a failed re-check as success: the details were written', async () => {
    mockVerify.mockRejectedValue(new Error('verify failed'));
    const onError = jest.fn();

    await persistRecordedIacTemplate({
      recorded,
      cloudConnectorId: 'connector-1',
      integrationsKey: guardDutyKey,
      onError,
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiamApiKeyProvisioningStatus } from '@kbn/uiam-api-keys-provisioning-status';
import type { ConvertUiamAPIKeysResponse } from '@kbn/core-security-server';
import type { ApiKeyToConvert } from '../types';
import { mapUiamConvertResponseToKeyResults } from './map_uiam_convert_response_to_key_results';

const uiamSuccess = (id: string, key: string) => ({
  status: 'success' as const,
  id,
  key,
  description: 'd',
  organization_id: 'o',
  internal: false,
  role_assignments: {} as Record<string, unknown>,
  creation_date: '2020-01-01T00:00:00.000Z',
  expiration_date: null as string | null,
});

describe('mapUiamConvertResponseToKeyResults', () => {
  it('maps success to converted rows with base64 uiamApiKey and preserves attributes/version', () => {
    const apiKeysToConvert: ApiKeyToConvert[] = [
      {
        taskId: 'task-a',
        attributes: {
          apiKey: 'k1',
          taskType: 'alerting:.index-threshold',
          userScope: { apiKeyId: 'es1', apiKeyCreatedByUser: false },
        },
        version: 'v9',
      },
    ];
    const response: ConvertUiamAPIKeysResponse = {
      results: [uiamSuccess('uiam-1', 'plain-secret')],
    };

    const { converted, provisioningStatusForFailedConversions } =
      mapUiamConvertResponseToKeyResults(apiKeysToConvert, response);

    expect(provisioningStatusForFailedConversions).toEqual([]);
    expect(converted).toHaveLength(1);
    expect(converted[0].taskId).toBe('task-a');
    expect(converted[0].uiamApiKeyId).toBe('uiam-1');
    expect(converted[0].version).toBe('v9');
    expect(converted[0].attributes).toEqual(apiKeysToConvert[0].attributes);
    expect(converted[0].uiamApiKey).toBe(
      Buffer.from('uiam-1:plain-secret', 'utf8').toString('base64')
    );
  });

  it('maps failed result to failed-conversion status (no converted row)', () => {
    const apiKeysToConvert: ApiKeyToConvert[] = [
      {
        taskId: 'task-b',
        attributes: {
          apiKey: 'k1',
          taskType: 'alerting:.index-threshold',
          userScope: { apiKeyId: 'es1', apiKeyCreatedByUser: false },
        },
      },
    ];
    const response: ConvertUiamAPIKeysResponse = {
      results: [
        {
          status: 'failed',
          code: 'c1',
          message: 'nope',
          resource: 'r1',
          type: 't1',
        },
      ],
    };

    const { converted, provisioningStatusForFailedConversions } =
      mapUiamConvertResponseToKeyResults(apiKeysToConvert, response);

    expect(converted).toEqual([]);
    expect(provisioningStatusForFailedConversions).toHaveLength(1);
    expect(provisioningStatusForFailedConversions[0].id).toBe('task-b');
    expect(provisioningStatusForFailedConversions[0].attributes.status).toBe(
      UiamApiKeyProvisioningStatus.FAILED
    );
    expect(provisioningStatusForFailedConversions[0].attributes.message).toContain('task-b');
    expect(provisioningStatusForFailedConversions[0].attributes.message).toContain('nope');
  });

  it('zips by index: mixed success and failure in one response', () => {
    const apiKeysToConvert: ApiKeyToConvert[] = [
      {
        taskId: 'a',
        attributes: {
          apiKey: 'k0',
          taskType: 'alerting:.index-threshold',
          userScope: { apiKeyId: 'e0', apiKeyCreatedByUser: false },
        },
      },
      {
        taskId: 'b',
        attributes: {
          apiKey: 'k1',
          taskType: 'alerting:.index-threshold',
          userScope: { apiKeyId: 'e1', apiKeyCreatedByUser: false },
        },
      },
    ];
    const response: ConvertUiamAPIKeysResponse = {
      results: [
        uiamSuccess('u0', 's0'),
        {
          status: 'failed',
          code: 'c',
          message: 'err',
          resource: null,
          type: 't',
        },
      ],
    };

    const { converted, provisioningStatusForFailedConversions } =
      mapUiamConvertResponseToKeyResults(apiKeysToConvert, response);

    expect(converted).toHaveLength(1);
    expect(converted[0].taskId).toBe('a');
    expect(provisioningStatusForFailedConversions).toHaveLength(1);
    expect(provisioningStatusForFailedConversions[0].id).toBe('b');
  });
});

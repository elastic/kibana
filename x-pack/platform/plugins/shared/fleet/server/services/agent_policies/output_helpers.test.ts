/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { securityMock } from '@kbn/security-plugin/server/mocks';

import {
  BEATS_OUTPUT_TYPES,
  ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
  SERVERLESS_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
} from '../../../common/constants';
import { appContextService } from '..';
import { outputService } from '../output';

import { validateOutputForPolicy } from '.';
import { validateAgentPolicyOutputForIntegration } from './outputs_helpers';

jest.mock('../app_context');
jest.mock('../output');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedOutputService = outputService as jest.Mocked<typeof outputService>;

function mockHasLicence(res: boolean) {
  mockedAppContextService.getSecurityLicense.mockReturnValue({
    hasAtLeast: () => res,
  } as any);
}

describe('validateOutputForPolicy', () => {
  beforeEach(() => {
    mockedOutputService.get.mockResolvedValue({ type: 'elasticsearch' } as any);
  });

  describe('Without oldData (create)', () => {
    it('should allow default outputs without platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: null },
        {},
        BEATS_OUTPUT_TYPES
      );
    });

    it('should allow default outputs with platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: null },
        {},
        BEATS_OUTPUT_TYPES
      );
    });

    it('should not allow custom data outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: 'test1', monitoring_output_id: null },
        {},
        BEATS_OUTPUT_TYPES
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should not allow custom monitoring outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: 'test1' },
        {},
        BEATS_OUTPUT_TYPES
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should allow custom data output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: 'test1', monitoring_output_id: null },
        {},
        BEATS_OUTPUT_TYPES
      );
    });

    it('should allow custom monitoring output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: 'test1' },
        {},
        BEATS_OUTPUT_TYPES
      );
    });

    it('should allow custom outputs for managed preconfigured policy without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          is_managed: true,
          is_preconfigured: true,
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        {},
        BEATS_OUTPUT_TYPES
      );
    });
  });

  describe('With oldData (update)', () => {
    it('should allow default outputs without platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: null },
        { data_output_id: 'test1', monitoring_output_id: 'test1' },
        BEATS_OUTPUT_TYPES
      );
    });

    it('should not allow custom data outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: 'test1', monitoring_output_id: null },
        { data_output_id: null, monitoring_output_id: null },
        BEATS_OUTPUT_TYPES
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should not allow custom monitoring outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: 'test1' },
        { data_output_id: null, monitoring_output_id: null },
        BEATS_OUTPUT_TYPES
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should allow custom data output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: 'test1', monitoring_output_id: null },
        { data_output_id: 'test1', monitoring_output_id: null },
        BEATS_OUTPUT_TYPES
      );
    });

    it('should allow custom monitoring output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: 'test1' },
        {},
        BEATS_OUTPUT_TYPES
      );
    });

    it('should allow custom outputs for managed preconfigured policy without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: 'test1', monitoring_output_id: 'test1' },
        { is_managed: true, is_preconfigured: true },
        BEATS_OUTPUT_TYPES
      );
    });

    it('should allow custom outputs if they did not change without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: 'test1', monitoring_output_id: 'test1' },
        { data_output_id: 'test1', monitoring_output_id: 'test1' },
        BEATS_OUTPUT_TYPES
      );
    });

    it('should not allow logstash output to be used with a policy using fleet server, synthetics or APM', async () => {
      mockHasLicence(true);
      mockedOutputService.get.mockResolvedValue({
        type: 'logstash',
      } as any);
      await expect(
        validateOutputForPolicy(
          savedObjectsClientMock.create(),
          {
            name: 'Fleet server policy',
            data_output_id: 'test1',
            monitoring_output_id: 'test1',
          },
          { data_output_id: 'newdataoutput', monitoring_output_id: 'test1' },
          ['elasticsearch']
        )
      ).rejects.toThrow(
        'Output of type "logstash" is not usable with policy "Fleet server policy".'
      );
    });

    it('should allow elasticsearch output to be used with a policy using fleet server, synthetics or APM', async () => {
      mockHasLicence(true);
      mockedOutputService.get.mockResolvedValue({
        type: 'elasticsearch',
      } as any);

      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { data_output_id: 'newdataoutput', monitoring_output_id: 'test1' },
        ['elasticsearch']
      );
    });

    it('should allow logstash output for a policy not using APM', async () => {
      mockHasLicence(true);
      mockedOutputService.get.mockResolvedValue({
        type: 'logstash',
      } as any);

      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { data_output_id: 'newdataoutput', monitoring_output_id: 'test1' },
        ['logstash', 'elasticsearch']
      );
    });
  });
});

describe('validateOutputForPolicy managed bulk guard', () => {
  it('should reject a non-agentless policy setting data_output_id to the ECH managed bulk output', async () => {
    mockHasLicence(true);
    await expect(
      validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID, monitoring_output_id: null },
        {},
        BEATS_OUTPUT_TYPES
      )
    ).rejects.toThrow(
      `Output "${ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID}" can only be used with an agentless agent policy.`
    );
  });

  it('should reject a non-agentless policy setting monitoring_output_id to the serverless managed bulk output', async () => {
    mockHasLicence(true);
    await expect(
      validateOutputForPolicy(
        savedObjectsClientMock.create(),
        { data_output_id: null, monitoring_output_id: SERVERLESS_AGENTLESS_MANAGED_BULK_OUTPUT_ID },
        {},
        BEATS_OUTPUT_TYPES
      )
    ).rejects.toThrow(
      `Output "${SERVERLESS_AGENTLESS_MANAGED_BULK_OUTPUT_ID}" can only be used with an agentless agent policy.`
    );
  });

  it('should allow an agentless policy to use the managed bulk output via newData', async () => {
    mockHasLicence(true);
    await validateOutputForPolicy(
      savedObjectsClientMock.create(),
      {
        supports_agentless: true,
        data_output_id: ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
        monitoring_output_id: ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
      },
      {},
      BEATS_OUTPUT_TYPES
    );
  });
});

describe('validateAgentPolicyOutputForIntegration', () => {
  it('should not allow fleet_server integration to be added or edited to a policy using a logstash output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'logstash',
    } as any);
    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'Agent policy',
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        } as any,
        {} as any,
        'fleet_server'
      )
    ).rejects.toThrow(
      'Integration "fleet_server" cannot be added to agent policy "Agent policy" because it uses output type "logstash".'
    );
    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'Agent policy',
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        } as any,
        {} as any,
        'fleet_server',
        false
      )
    ).rejects.toThrow(
      'Agent policy "Agent policy" uses output type "logstash" which cannot be used for integration "fleet_server".'
    );
  });

  it('should not allow apm integration to be added or edited to a policy using a kafka output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'kafka',
    } as any);
    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'Agent policy',
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        } as any,
        {} as any,
        'apm'
      )
    ).rejects.toThrow(
      'Integration "apm" cannot be added to agent policy "Agent policy" because it uses output type "kafka".'
    );
    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'Agent policy',
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        } as any,
        {} as any,
        'apm',
        false
      )
    ).rejects.toThrow(
      'Agent policy "Agent policy" uses output type "kafka" which cannot be used for integration "apm".'
    );
  });

  it('should not allow synthetics integration to be added to a policy using a default logstash output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'logstash',
    } as any);
    mockedOutputService.getDefaultDataOutputId.mockResolvedValue('default');
    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'Agent policy',
        } as any,
        {} as any,
        'synthetics'
      )
    ).rejects.toThrow(
      'Integration "synthetics" cannot be added to agent policy "Agent policy" because it uses output type "logstash".'
    );
  });

  it('should allow other integration to be added to a policy using logstash output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'logstash',
    } as any);

    await validateAgentPolicyOutputForIntegration(
      savedObjectsClientMock.create(),
      {
        name: 'Agent policy',
      } as any,
      {} as any,
      'nginx'
    );
  });

  it('should allow fleet_server integration to be added to a policy using elasticsearch output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'elasticsearch',
    } as any);

    await validateAgentPolicyOutputForIntegration(
      savedObjectsClientMock.create(),
      {
        name: 'Agent policy',
      } as any,
      {} as any,
      'fleet_server'
    );
  });

  it('should allow an OTel-only integration to be added to a policy using an otlp output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'otlp',
    } as any);

    await validateAgentPolicyOutputForIntegration(
      savedObjectsClientMock.create(),
      {
        name: 'Agent policy',
        data_output_id: 'otlp-output',
      } as any,
      {
        inputs: [{ type: 'otelcol', enabled: true }],
      } as any,
      'test_otel_dynamic'
    );
  });

  it('should not allow a beats integration to be added to a policy using an otlp output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'otlp',
    } as any);

    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'OTel policy',
          data_output_id: 'otlp-output',
        } as any,
        {
          inputs: [{ type: 'logfile', enabled: true }],
        } as any,
        'filetest'
      )
    ).rejects.toThrow(
      'Integration "filetest" cannot be added to agent policy "OTel policy" because it uses output type "otlp".'
    );
  });

  it('should not allow a mixed OTel+beats integration to be added to a policy using an otlp output', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'otlp',
    } as any);

    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'OTel policy',
          data_output_id: 'otlp-output',
        } as any,
        {
          inputs: [
            { type: 'otelcol', enabled: true },
            { type: 'logfile', enabled: true },
          ],
        } as any,
        'mixed_package'
      )
    ).rejects.toThrow(
      'Integration "mixed_package" cannot be added to agent policy "OTel policy" because it uses output type "otlp".'
    );
  });

  it('should not allow non-local ES output to be added or edited to an agentless policy', async () => {
    mockHasLicence(true);
    mockedOutputService.get.mockResolvedValue({
      type: 'logstash',
    } as any);
    mockedOutputService.getDefaultDataOutputId.mockResolvedValue('default');
    await expect(
      validateAgentPolicyOutputForIntegration(
        savedObjectsClientMock.create(),
        {
          name: 'Agent policy',
        } as any,
        {
          supports_agentless: true,
        } as any,
        'some_package'
      )
    ).rejects.toThrow(
      'Integration "some_package" cannot be added to agent policy "Agent policy" because it uses output type "logstash".'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { securityMock } from '@kbn/security-plugin/server/mocks';

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
  describe('Without oldData (create)', () => {
    it('should allow default outputs without platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: null,
      });
    });

    it('should allow default outputs with platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: null,
      });
    });

    it('should not allow custom data outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: 'test1',
        monitoring_output_id: null,
      });
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should not allow custom monitoring outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: 'test1',
      });
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should allow custom data output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: 'test1',
        monitoring_output_id: null,
      });
    });

    it('should allow custom monitoring output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: 'test1',
      });
    });

    it('should allow custom outputs for managed preconfigured policy without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        is_managed: true,
        is_preconfigured: true,
        data_output_id: 'test1',
        monitoring_output_id: 'test1',
      });
    });
  });

  describe('With oldData (update)', () => {
    it('should allow default outputs without platinum licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: null,
          monitoring_output_id: null,
        },
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        }
      );
    });

    it('should not allow custom data outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: null,
        },
        {
          data_output_id: null,
          monitoring_output_id: null,
        }
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should not allow custom monitoring outputs without platinum licence', async () => {
      mockHasLicence(false);
      const res = validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: null,
          monitoring_output_id: 'test1',
        },
        {
          data_output_id: null,
          monitoring_output_id: null,
        }
      );
      await expect(res).rejects.toThrow(
        'Invalid licence to set per policy output, you need platinum licence'
      );
    });

    it('should allow custom data output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: null,
        },
        {
          data_output_id: 'test1',
          monitoring_output_id: null,
        }
      );
    });

    it('should allow custom monitoring output with platinum licence', async () => {
      mockHasLicence(true);
      await validateOutputForPolicy(savedObjectsClientMock.create(), {
        data_output_id: null,
        monitoring_output_id: 'test1',
      });
    });

    it('should allow custom outputs for managed preconfigured policy without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { is_managed: true, is_preconfigured: true }
      );
    });

    it('should allow custom outputs if they did not change without licence', async () => {
      mockHasLicence(false);
      await validateOutputForPolicy(
        savedObjectsClientMock.create(),
        {
          data_output_id: 'test1',
          monitoring_output_id: 'test1',
        },
        { data_output_id: 'test1', monitoring_output_id: 'test1' }
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
      'fleet_server'
    );
  });
});

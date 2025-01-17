/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { createAppContextStartContractMock } from '../../../mocks';
import type { PackagePolicyInput } from '../../../../common/types';
import { appContextService } from '../..';

import { getTemplateInputs, templatePackagePolicyToFullInputStreams } from './get_template_inputs';
import REDIS_1_18_0_PACKAGE_INFO from './__fixtures__/redis_1_18_0_package_info.json';
import { getPackageAssetsMap, getPackageInfo } from './get';
import { REDIS_ASSETS_MAP } from './__fixtures__/redis_1_18_0_streams_template';
import { LOGS_2_3_0_ASSETS_MAP, LOGS_2_3_0_PACKAGE_INFO } from './__fixtures__/logs_2_3_0';
import { DOCKER_2_11_0_PACKAGE_INFO, DOCKER_2_11_0_ASSETS_MAP } from './__fixtures__/docker_2_11_0';

jest.mock('./get');

const packageInfoCache = new Map();
packageInfoCache.set('mock_package-0.0.0', {
  name: 'mock_package',
  version: '0.0.0',
  policy_templates: [
    {
      multiple: true,
    },
  ],
});
packageInfoCache.set('limited_package-0.0.0', {
  name: 'limited_package',
  version: '0.0.0',
  policy_templates: [
    {
      multiple: false,
    },
  ],
});

packageInfoCache.set('redis-1.18.0', REDIS_1_18_0_PACKAGE_INFO);
packageInfoCache.set('log-2.3.0', LOGS_2_3_0_PACKAGE_INFO);
packageInfoCache.set('docker-2.11.0', DOCKER_2_11_0_PACKAGE_INFO);

describe('Fleet - templatePackagePolicyToFullInputStreams', () => {
  const mockInput: PackagePolicyInput = {
    type: 'test-logs',
    enabled: true,
    vars: {
      inputVar: { value: 'input-value' },
      inputVar2: { value: undefined },
      inputVar3: {
        type: 'yaml',
        value: 'testField: test',
      },
      inputVar4: { value: '' },
    },
    streams: [
      {
        id: 'test-logs-foo',
        enabled: true,
        data_stream: { dataset: 'foo', type: 'logs' },
        vars: {
          fooVar: { value: 'foo-value' },
          fooVar2: { value: [1, 2] },
        },
        compiled_stream: {
          fooKey: 'fooValue1',
          fooKey2: ['fooValue2'],
        },
      },
      {
        id: 'test-logs-bar',
        enabled: true,
        data_stream: { dataset: 'bar', type: 'logs' },
        vars: {
          barVar: { value: 'bar-value' },
          barVar2: { value: [1, 2] },
          barVar3: {
            type: 'yaml',
            value:
              '- namespace: mockNamespace\n  #disabledProp: ["test"]\n  anotherProp: test\n- namespace: mockNamespace2\n  #disabledProp: ["test2"]\n  anotherProp: test2',
          },
          barVar4: {
            type: 'yaml',
            value: '',
          },
          barVar5: {
            type: 'yaml',
            value: 'testField: test\n invalidSpacing: foo',
          },
        },
      },
    ],
  };

  const mockInput2: PackagePolicyInput = {
    type: 'test-metrics',
    policy_template: 'some-template',
    enabled: true,
    vars: {
      inputVar: { value: 'input-value' },
      inputVar2: { value: undefined },
      inputVar3: {
        type: 'yaml',
        value: 'testField: test',
      },
      inputVar4: { value: '' },
    },
    streams: [
      {
        id: 'test-metrics-foo',
        enabled: true,
        data_stream: { dataset: 'foo', type: 'metrics' },
        vars: {
          fooVar: { value: 'foo-value' },
          fooVar2: { value: [1, 2] },
        },
        compiled_stream: {
          fooKey: 'fooValue1',
          fooKey2: ['fooValue2'],
        },
      },
    ],
  };

  it('returns no inputs for package policy with no inputs', async () => {
    expect(await templatePackagePolicyToFullInputStreams([])).toEqual([]);
  });

  it('returns inputs even when inputs where disabled', async () => {
    expect(
      await templatePackagePolicyToFullInputStreams([{ ...mockInput, enabled: false }])
    ).toEqual([
      {
        id: 'test-logs',
        type: 'test-logs',
        streams: [
          {
            data_stream: {
              dataset: 'foo',
              type: 'logs',
            },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            id: 'test-logs-foo',
          },
          {
            data_stream: {
              dataset: 'bar',
              type: 'logs',
            },
            id: 'test-logs-bar',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with streams', async () => {
    expect(await templatePackagePolicyToFullInputStreams([mockInput])).toEqual([
      {
        id: 'test-logs',
        type: 'test-logs',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            id: 'test-logs-bar',
            data_stream: { dataset: 'bar', type: 'logs' },
          },
        ],
      },
    ]);
  });

  it('returns unique agent inputs IDs, with policy template name if one exists for non-limited packages', async () => {
    expect(await templatePackagePolicyToFullInputStreams([mockInput])).toEqual([
      {
        id: 'test-logs',
        type: 'test-logs',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            id: 'test-logs-bar',
            data_stream: { dataset: 'bar', type: 'logs' },
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without streams', async () => {
    expect(await templatePackagePolicyToFullInputStreams([mockInput2])).toEqual([
      {
        id: 'some-template-test-metrics',
        type: 'test-metrics',
        streams: [
          {
            data_stream: {
              dataset: 'foo',
              type: 'metrics',
            },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            id: 'test-metrics-foo',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without disabled streams', async () => {
    expect(
      await templatePackagePolicyToFullInputStreams([
        {
          ...mockInput,
          streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
        },
      ])
    ).toEqual([
      {
        id: 'test-logs',
        type: 'test-logs',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            data_stream: {
              dataset: 'bar',
              type: 'logs',
            },
            id: 'test-logs-bar',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with deeply merged config values', async () => {
    expect(
      await templatePackagePolicyToFullInputStreams([
        {
          ...mockInput,
          compiled_input: {
            agent_input_template_group1_vars: {
              inputVar: 'input-value',
            },
            agent_input_template_group2_vars: {
              inputVar3: {
                testFieldGroup: {
                  subField1: 'subfield1',
                },
                testField: 'test',
              },
            },
          },
          config: {
            agent_input_template_group1_vars: {
              value: {
                inputVar2: {},
              },
            },
            agent_input_template_group2_vars: {
              value: {
                inputVar3: {
                  testFieldGroup: {
                    subField2: 'subfield2',
                  },
                },
                inputVar4: '',
              },
            },
          },
        },
      ])
    ).toEqual([
      {
        agent_input_template_group1_vars: {
          inputVar: 'input-value',
          inputVar2: {},
        },
        agent_input_template_group2_vars: {
          inputVar3: {
            testField: 'test',
            testFieldGroup: {
              subField1: 'subfield1',
              subField2: 'subfield2',
            },
          },
          inputVar4: '',
        },
        id: 'test-logs',
        type: 'test-logs',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          { id: 'test-logs-bar', data_stream: { dataset: 'bar', type: 'logs' } },
        ],
      },
    ]);
  });
});

describe('Fleet - getTemplateInputs', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    jest.mocked(getPackageAssetsMap).mockImplementation(async ({ packageInfo }) => {
      if (packageInfo.name === 'redis' && packageInfo.version === '1.18.0') {
        return REDIS_ASSETS_MAP;
      }

      if (packageInfo.name === 'log') {
        return LOGS_2_3_0_ASSETS_MAP;
      }
      if (packageInfo.name === 'docker') {
        return DOCKER_2_11_0_ASSETS_MAP;
      }

      return new Map();
    });
    jest.mocked(getPackageInfo).mockImplementation(async ({ pkgName, pkgVersion }) => {
      const pkgInfo = packageInfoCache.get(`${pkgName}-${pkgVersion}`);
      if (!pkgInfo) {
        throw new Error('package not mocked');
      }

      return pkgInfo;
    });
  });
  it('should work for integration package', async () => {
    const soMock = savedObjectsClientMock.create();
    soMock.get.mockResolvedValue({ attributes: {} } as any);
    const template = await getTemplateInputs(soMock, 'redis', '1.18.0', 'yml');

    expect(template).toMatchSnapshot();
  });

  it('should work for package with dynamic ids', async () => {
    const soMock = savedObjectsClientMock.create();
    soMock.get.mockResolvedValue({ attributes: {} } as any);
    const template = await getTemplateInputs(soMock, 'docker', '2.11.0', 'yml');

    expect(template).toMatchSnapshot();
  });

  it('should work for input package', async () => {
    const soMock = savedObjectsClientMock.create();
    soMock.get.mockResolvedValue({ attributes: {} } as any);
    const template = await getTemplateInputs(soMock, 'log', '2.3.0', 'yml');

    expect(template).toMatchSnapshot();
  });
});

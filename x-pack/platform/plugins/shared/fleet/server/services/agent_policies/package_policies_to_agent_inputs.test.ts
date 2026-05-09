/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DATA_STREAM_TYPE_VAR_NAME,
  GLOBAL_DATA_TAG_EXCLUDED_INPUTS,
  OTEL_COLLECTOR_INPUT_TYPE,
} from '../../../common/constants/epm';

import type { PackagePolicy, PackagePolicyInput } from '../../types';

import {
  getInputId,
  storedPackagePoliciesToAgentInputs,
  storedPackagePolicyToAgentInputs,
} from './package_policies_to_agent_inputs';

const packageInfoCache = new Map();
packageInfoCache.set('mock_package-0.0.0', {
  name: 'mock_package',
  version: '0.0.0',
  release: 'beta',
  policy_templates: [
    {
      multiple: true,
    },
  ],
});
packageInfoCache.set('limited_package-0.0.0', {
  name: 'limited_package',
  version: '0.0.0',
  release: 'ga',
  policy_templates: [
    {
      multiple: false,
    },
  ],
});
packageInfoCache.set('endpoint-8.5.0', {
  name: 'endpoint',
  version: '8.5.0',
  release: 'ga',
  policy_templates: [
    {
      multiple: false,
    },
  ],
});
packageInfoCache.set('mock_package_agentless-0.0.0', {
  name: 'mock_package_agentless',
  version: '0.0.0',
  policy_templates: [
    {
      multiple: true,
      deployment_modes: {
        agentless: {
          organization: 'elastic',
          division: 'engineering',
          team: 'security-service-integrations',
        },
      },
    },
  ],
});

describe('Fleet - storedPackagePoliciesToAgentInputs', () => {
  const mockPackagePolicy: PackagePolicy = {
    id: 'some-uuid',
    name: 'mock_package-policy',
    description: '',
    created_at: '',
    created_by: '',
    updated_at: '',
    updated_by: '',
    policy_id: '',
    policy_ids: [''],
    enabled: true,
    namespace: 'default',
    inputs: [],
    revision: 1,
  };

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
          data_stream: { dataset: 'foo' }, // data_stream.dataset can be set in the compiled stream, ensure that rest of data_stream object is properly merged.
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
          data_stream: { dataset: 'foo' }, // data_stream.dataset can be set in the compiled stream, ensure that rest of data_stream object is properly merged.
        },
      },
    ],
  };

  it('returns no inputs for package policy with no inputs, or only disabled inputs', async () => {
    expect(await storedPackagePoliciesToAgentInputs([mockPackagePolicy], packageInfoCache)).toEqual(
      []
    );

    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
          },
        ],
        packageInfoCache
      )
    ).toEqual([]);

    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [{ ...mockInput, enabled: false }],
          },
        ],
        packageInfoCache
      )
    ).toEqual([]);
  });

  it('returns agent inputs with streams', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [mockInput],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
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

  it('returns unique agent inputs IDs with policy template name for all packages including limited ones', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [mockInput, mockInput2],
            output_id: 'new-output',
          },
          {
            ...mockPackagePolicy,
            package: {
              name: 'limited_package',
              title: 'Limited package',
              version: '0.0.0',
            },
            inputs: [mockInput2],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'new-output',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
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
      {
        id: 'test-metrics-some-template-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-metrics',
        data_stream: { namespace: 'default' },
        use_output: 'new-output',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            policy_template: 'some-template',
            release: 'beta',
          },
        },
        streams: [
          {
            id: 'test-metrics-foo',
            data_stream: { dataset: 'foo', type: 'metrics' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
      {
        id: 'test-metrics-some-template-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-metrics',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'limited_package',
            version: '0.0.0',
            release: 'ga',
            policy_template: 'some-template',
          },
        },
        streams: [
          {
            id: 'test-metrics-foo',
            data_stream: { dataset: 'foo', type: 'metrics' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns simplified ID for endpoint (Elastic Defend) package', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'endpoint',
              title: 'Endpoint',
              version: '8.5.0',
            },
            inputs: [mockInput2],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-metrics',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'endpoint',
            version: '8.5.0',
            release: 'ga',
            policy_template: 'some-template',
          },
        },
        streams: [
          {
            id: 'test-metrics-foo',
            data_stream: { dataset: 'foo', type: 'metrics' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without streams', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        inputVar: 'input-value',
      },
    ]);
  });

  it('returns agent inputs without disabled streams', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with deeply merged config values', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
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
            ],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        revision: 1,
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
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
  it('returns agent inputs using package policy namespace if defined', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
            namespace: 'packagepolicyspace',
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'packagepolicyspace' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });
  it('returns agent inputs using agent policy namespace if package policy namespace is blank', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
            namespace: '',
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'agentpolicyspace' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns agent inputs merged with overrides from package policies if available for that input', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
              },
            ],
            namespace: '',
            overrides: {
              inputs: {
                'test-logs-some-uuid': {
                  log_level: 'debug',
                },
              },
            },
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'agentpolicyspace' },
        use_output: 'default',
        log_level: 'debug',
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

  it('returns agent inputs merged with overrides based on passed input id', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [mockInput, mockInput2],
            namespace: '',
            overrides: {
              inputs: {
                'test-logs-some-uuid': {
                  log_level: 'debug',
                },
              },
            },
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        log_level: 'debug',
        data_stream: {
          namespace: 'default',
        },
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
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
        type: 'test-logs',
        use_output: 'default',
      },
      {
        data_stream: {
          namespace: 'default',
        },
        id: 'test-metrics-some-template-some-uuid',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
            policy_template: 'some-template',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
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
        type: 'test-metrics',
        use_output: 'default',
      },
    ]);
  });

  it('returns unchanged agent inputs if overrides are empty', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            inputs: [
              {
                ...mockInput,
                streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
              },
            ],
            namespace: '',
            overrides: {
              inputs: {},
            },
          },
        ],
        packageInfoCache,
        'default',
        'agentpolicyspace'
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'agentpolicyspace' },
        use_output: 'default',
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with overridden data_stream.type from stream vars', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [
              {
                ...mockInput,
                streams: [
                  {
                    ...mockInput.streams[0],
                    vars: {
                      ...mockInput.streams[0].vars,
                      'data_stream.type': { value: 'metrics' },
                    },
                  },
                ],
              },
            ],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'metrics' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('does not override data_stream.type when stream var is not set', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [
              {
                ...mockInput,
                streams: [mockInput.streams[0]],
              },
            ],
          },
        ],
        packageInfoCache
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with add fields process if global data tags are defined', async () => {
    const excludedInputs: PackagePolicyInput[] = [];
    const expectedExcluded = [];

    for (const input of GLOBAL_DATA_TAG_EXCLUDED_INPUTS) {
      excludedInputs.push({
        type: input,
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
        streams: [],
      });

      expectedExcluded.push({
        data_stream: {
          namespace: 'default',
        },
        id: `${input}-some-uuid`,
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: input,
        use_output: 'default',
      });
    }

    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [
              ...excludedInputs,
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
              {
                ...mockInput2,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache,
        undefined,
        undefined,
        [
          { name: 'testName', value: 'testValue' },
          { name: 'testName2', value: 'testValue2' },
        ]
      )
    ).toEqual([
      ...expectedExcluded,
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              fields: {
                testName: 'testValue',
                testName2: 'testValue2',
              },
              target: '',
            },
          },
        ],
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        inputVar: 'input-value',
      },
      {
        id: 'test-metrics-some-template-some-uuid',
        data_stream: {
          namespace: 'default',
        },
        inputVar: 'input-value',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
            policy_template: 'some-template',
          },
        },
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              target: '',
              fields: {
                testName: 'testValue',
                testName2: 'testValue2',
              },
            },
          },
        ],
        revision: 1,
        type: 'test-metrics',
        use_output: 'default',
      },
    ]);
  });

  it('does not include processor add_fields when global tags array is empty', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            inputs: [
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache,
        undefined,
        undefined,
        []
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        inputVar: 'input-value',
      },
    ]);
  });

  it('returns agent inputs with add fields process from global data tags excluding agentless defaults', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            name: 'mock_package_agentless-policy',
            package: {
              name: 'mock_package_agentless',
              title: 'Mock package agentless',
              version: '0.0.0',
            },
            inputs: [
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
              {
                ...mockInput2,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache,
        undefined,
        undefined,
        [
          { name: 'testName', value: 'testValue' },
          { name: 'testName2', value: 'testValue2' },
          { name: 'organization', value: 'elastic' },
          { name: 'division', value: 'engineering' },
          { name: 'team', value: 'security-service-integrations' },
          { name: 'organization', value: 'foo' },
        ]
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package_agentless-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              fields: {
                testName: 'testValue',
                testName2: 'testValue2',
                organization: 'foo',
              },
              target: '',
            },
          },
        ],
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package_agentless',
            version: '0.0.0',
          },
        },
        inputVar: 'input-value',
      },
      {
        id: 'test-metrics-some-template-some-uuid',
        data_stream: {
          namespace: 'default',
        },
        inputVar: 'input-value',
        meta: {
          package: {
            name: 'mock_package_agentless',
            version: '0.0.0',
            policy_template: 'some-template',
          },
        },
        name: 'mock_package_agentless-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              target: '',
              fields: {
                testName: 'testValue',
                testName2: 'testValue2',
                organization: 'foo',
              },
            },
          },
        ],
        revision: 1,
        type: 'test-metrics',
        use_output: 'default',
      },
    ]);
  });
  it('merges package policy global_data_tags into the add_fields processor', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            supports_agentless: true,
            global_data_tags: [
              { name: 'client_id', value: 'acme' },
              { name: 'env', value: 'prod' },
            ],
            inputs: [
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache,
        undefined,
        undefined,
        undefined
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              fields: {
                client_id: 'acme',
                env: 'prod',
              },
              target: '',
            },
          },
        ],
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        inputVar: 'input-value',
      },
    ]);
  });

  it('merges agent policy global_data_tags and package policy global_data_tags together', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            supports_agentless: true,
            global_data_tags: [{ name: 'client_id', value: 'acme' }],
            inputs: [
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache,
        undefined,
        undefined,
        [{ name: 'organization', value: 'elastic' }]
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        processors: [
          {
            add_fields: {
              fields: {
                organization: 'elastic',
                client_id: 'acme',
              },
              target: '',
            },
          },
        ],
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        inputVar: 'input-value',
      },
    ]);
  });

  it('does not add processor when package policy global_data_tags is empty', async () => {
    expect(
      await storedPackagePoliciesToAgentInputs(
        [
          {
            ...mockPackagePolicy,
            package: {
              name: 'mock_package',
              title: 'Mock package',
              version: '0.0.0',
            },
            supports_agentless: true,
            global_data_tags: [],
            inputs: [
              {
                ...mockInput,
                compiled_input: {
                  inputVar: 'input-value',
                },
                streams: [],
              },
            ],
          },
        ],
        packageInfoCache,
        undefined,
        undefined,
        undefined
      )
    ).toEqual([
      {
        id: 'test-logs-some-uuid',
        name: 'mock_package-policy',
        package_policy_id: 'some-uuid',
        revision: 1,
        type: 'test-logs',
        data_stream: { namespace: 'default' },
        use_output: 'default',
        meta: {
          package: {
            name: 'mock_package',
            version: '0.0.0',
            release: 'beta',
          },
        },
        inputVar: 'input-value',
      },
    ]);
  });
});

describe('storedPackagePolicyToAgentInputs - dynamic_signal_types handling', () => {
  const baseMockPolicy: PackagePolicy = {
    id: 'some-uuid',
    name: 'mock-policy',
    description: '',
    created_at: '',
    created_by: '',
    updated_at: '',
    updated_by: '',
    policy_id: '',
    policy_ids: [''],
    enabled: true,
    namespace: 'default',
    inputs: [],
    revision: 1,
    package: { name: 'sql_server_input_otel', version: '1.0.0', title: 'SQL Server OTel' },
  };

  const dynamicPackageInfo: any = {
    name: 'sql_server_input_otel',
    version: '1.0.0',
    type: 'input',
    policy_templates: [
      {
        name: 'otel',
        input: OTEL_COLLECTOR_INPUT_TYPE,
        dynamic_signal_types: true,
        title: 'SQL OTel',
        description: 'OTel input',
        template_path: 'some/path.hbs',
      },
    ],
  };

  it('strips undefined type for dynamic_signal_types package stream when data_stream.type variable is not set', () => {
    const policy: PackagePolicy = {
      ...baseMockPolicy,
      inputs: [
        {
          type: OTEL_COLLECTOR_INPUT_TYPE,
          enabled: true,
          streams: [
            {
              id: 'stream-dynamic',
              enabled: true,
              data_stream: { dataset: 'otel.dataset' },
            } as any,
          ],
        },
      ],
    };

    const result = storedPackagePolicyToAgentInputs(policy, dynamicPackageInfo);
    expect(result).toHaveLength(1);
    const stream = result[0].streams?.[0];
    expect(stream).toBeDefined();
    expect(stream?.data_stream.type).toBeUndefined();
    // Ensure the key is stripped (not present as undefined)
    expect('type' in (stream?.data_stream ?? {})).toBe(false);
  });

  it('uses data_stream.type variable value when set for dynamic_signal_types package', () => {
    const policy: PackagePolicy = {
      ...baseMockPolicy,
      inputs: [
        {
          type: OTEL_COLLECTOR_INPUT_TYPE,
          enabled: true,
          streams: [
            {
              id: 'stream-dynamic',
              enabled: true,
              data_stream: { dataset: 'otel.dataset' },
              vars: { [DATA_STREAM_TYPE_VAR_NAME]: { value: 'metrics' } },
            } as any,
          ],
        },
      ],
    };

    const result = storedPackagePolicyToAgentInputs(policy, dynamicPackageInfo);
    expect(result).toHaveLength(1);
    const stream = result[0].streams?.[0];
    expect(stream?.data_stream.type).toEqual('metrics');
  });

  it('throws for non-dynamic package with undefined data_stream.type', () => {
    const nonDynamicPackageInfo: any = {
      name: 'regular-package',
      version: '1.0.0',
      type: 'integration',
      policy_templates: [],
    };
    const policy: PackagePolicy = {
      ...baseMockPolicy,
      package: { name: 'regular-package', version: '1.0.0', title: 'Regular' },
      inputs: [
        {
          type: 'logfile',
          enabled: true,
          streams: [
            {
              id: 'stream-no-type',
              enabled: true,
              data_stream: { dataset: 'regular.dataset' },
            } as any,
          ],
        },
      ],
    };

    expect(() => storedPackagePolicyToAgentInputs(policy, nonDynamicPackageInfo)).toThrowError(
      '[data_stream.type]: unexpected undefined stream type for non-dynamic package'
    );
  });
});

describe('getInputId', () => {
  it('should use name instead of type when name is present', () => {
    const id = getInputId(
      {
        type: 'otelcol',
        name: 'filelog_otel',
        policy_template: 'nginx',
        enabled: true,
        streams: [],
      },
      'pkg-policy-123'
    );

    expect(id).toBe('filelog_otel-nginx-pkg-policy-123');
  });

  it('should fall back to type when name is not present', () => {
    const id = getInputId(
      {
        type: 'logfile',
        policy_template: 'nginx',
        enabled: true,
        streams: [],
      },
      'pkg-policy-123'
    );

    expect(id).toBe('logfile-nginx-pkg-policy-123');
  });

  it('should produce unique ids for same-type inputs with different names', () => {
    const id1 = getInputId(
      {
        type: 'otelcol',
        name: 'filelog_otel',
        policy_template: 'nginx',
        enabled: true,
        streams: [],
      },
      'pkg-policy-123'
    );
    const id2 = getInputId(
      {
        type: 'otelcol',
        name: 'nginx_otel',
        policy_template: 'nginx',
        enabled: true,
        streams: [],
      },
      'pkg-policy-123'
    );

    expect(id1).not.toBe(id2);
  });
});

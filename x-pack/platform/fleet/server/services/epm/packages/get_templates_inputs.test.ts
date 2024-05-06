/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicyInput } from '../../../../common/types';

import { templatePackagePolicyToFullInputs } from './get_template_inputs';

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

describe('Fleet - templatePackagePolicyToFullInputs', () => {
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
    expect(await templatePackagePolicyToFullInputs([])).toEqual([]);
  });

  it('returns inputs even when inputs where disabled', async () => {
    expect(await templatePackagePolicyToFullInputs([{ ...mockInput, enabled: false }])).toEqual([
      {
        streams: [
          {
            data_stream: {
              dataset: 'foo',
              type: 'logs',
            },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            id: 'test-logs-foo',
            type: 'test-logs',
          },
          {
            data_stream: {
              dataset: 'bar',
              type: 'logs',
            },
            id: 'test-logs-bar',
            type: 'test-logs',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with streams', async () => {
    expect(await templatePackagePolicyToFullInputs([mockInput])).toEqual([
      {
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            type: 'test-logs',
          },
          {
            id: 'test-logs-bar',
            data_stream: { dataset: 'bar', type: 'logs' },
            type: 'test-logs',
          },
        ],
      },
    ]);
  });

  it('returns unique agent inputs IDs, with policy template name if one exists for non-limited packages', async () => {
    expect(await templatePackagePolicyToFullInputs([mockInput])).toEqual([
      {
        streams: [
          {
            id: 'test-logs-foo',
            type: 'test-logs',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
          },
          {
            id: 'test-logs-bar',
            data_stream: { dataset: 'bar', type: 'logs' },
            type: 'test-logs',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without streams', async () => {
    expect(await templatePackagePolicyToFullInputs([mockInput2])).toEqual([
      {
        streams: [
          {
            data_stream: {
              dataset: 'foo',
              type: 'metrics',
            },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            id: 'test-metrics-foo',
            type: 'test-metrics',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs without disabled streams', async () => {
    expect(
      await templatePackagePolicyToFullInputs([
        {
          ...mockInput,
          streams: [{ ...mockInput.streams[0] }, { ...mockInput.streams[1], enabled: false }],
        },
      ])
    ).toEqual([
      {
        streams: [
          {
            id: 'test-logs-foo',
            type: 'test-logs',
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
            type: 'test-logs',
          },
        ],
      },
    ]);
  });

  it('returns agent inputs with deeply merged config values', async () => {
    expect(
      await templatePackagePolicyToFullInputs([
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
        streams: [
          {
            id: 'test-logs-foo',
            data_stream: { dataset: 'foo', type: 'logs' },
            fooKey: 'fooValue1',
            fooKey2: ['fooValue2'],
            type: 'test-logs',
          },
          { id: 'test-logs-bar', data_stream: { dataset: 'bar', type: 'logs' }, type: 'test-logs' },
        ],
      },
    ]);
  });
});

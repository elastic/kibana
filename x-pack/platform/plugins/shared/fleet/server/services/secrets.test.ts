/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2[0].
 */

import { v4 as uuidv4 } from 'uuid';

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { createAppContextStartContractMock } from '../mocks';

import type { NewPackagePolicy, PackageInfo, PackagePolicy, UpdatePackagePolicy } from '../types';

import { appContextService } from './app_context';
import {
  getPolicySecretPaths,
  diffSecretPaths,
  diffSOSecretPaths,
  extractAndWriteSecrets,
  extractAndUpdateSecrets,
  extractAndUpdateOutputSecrets,
  extractAndWriteFleetServerHostsSecrets,
  extractAndUpdateFleetServerHostsSecrets,
  extractAndWriteDownloadSourcesSecrets,
  extractAndUpdateDownloadSourceSecrets,
  deleteDownloadSourceSecrets,
  deleteFleetServerHostsSecrets,
  extractAndWriteOutputSecrets,
  deleteOutputSecrets,
} from './secrets';

describe('secrets', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;

  beforeEach(async () => {
    // prevents `Logger not set.` and other appContext errors
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });

  describe('getPolicySecretPaths', () => {
    describe('integration package with one policy template', () => {
      const mockIntegrationPackage = {
        name: 'mock-package',
        title: 'Mock package',
        version: '0[0].0',
        description: 'description',
        type: 'integration',
        status: 'not_installed',
        vars: [
          { name: 'pkg-secret-1', type: 'text', secret: true },
          { name: 'pkg-secret-2', type: 'text', secret: true },
          { name: 'pkg-multi-secret', type: 'text', multi: true, secret: true },
        ],
        data_streams: [
          {
            dataset: 'somedataset',
            streams: [
              {
                input: 'foo',
                title: 'Foo',
                vars: [
                  { name: 'stream-secret-1', type: 'text', secret: true },
                  { name: 'stream-secret-2', type: 'text', secret: true },
                  { name: 'stream-multi-secret', type: 'text', multi: true, secret: true },
                ],
              },
            ],
          },
        ],
        policy_templates: [
          {
            name: 'pkgPolicy1',
            title: 'Package policy 1',
            description: 'test package policy',
            inputs: [
              {
                type: 'foo',
                title: 'Foo',
                vars: [
                  { default: 'foo-input-var-value', name: 'foo-input-var-name', type: 'text' },
                  {
                    name: 'input-secret-1',
                    type: 'text',
                    secret: true,
                  },
                  {
                    name: 'input-secret-2',
                    type: 'text',
                    secret: true,
                  },
                  {
                    name: 'input-multi-secret',
                    type: 'text',
                    multi: true,
                    secret: true,
                  },
                  { name: 'foo-input3-var-name', type: 'text', multi: true },
                ],
              },
            ],
          },
        ],
      } as unknown as PackageInfo;

      it('policy with package level secret vars', () => {
        const packagePolicy = {
          vars: {
            'pkg-secret-1': {
              value: 'pkg-secret-1-val',
            },
            'pkg-secret-2': {
              value: 'pkg-secret-2-val',
            },
            'pkg-multi-secret': {
              value: ['pkg-multi-secret-val1', 'pkg-multi-secret-val2'],
            },
          },
          inputs: [],
        } as unknown as NewPackagePolicy;

        expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
          {
            path: ['vars', 'pkg-secret-1'],
            value: {
              value: 'pkg-secret-1-val',
            },
          },
          {
            path: ['vars', 'pkg-secret-2'],
            value: {
              value: 'pkg-secret-2-val',
            },
          },
          {
            path: ['vars', 'pkg-multi-secret'],
            value: {
              value: ['pkg-multi-secret-val1', 'pkg-multi-secret-val2'],
            },
          },
        ]);
      });
      it('policy with package level secret vars and only one set', () => {
        const packagePolicy = {
          vars: {
            'pkg-secret-1': {
              value: 'pkg-secret-1-val',
            },
          },
          inputs: [],
        } as unknown as NewPackagePolicy;

        expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
          {
            path: ['vars', 'pkg-secret-1'],
            value: {
              value: 'pkg-secret-1-val',
            },
          },
        ]);
      });
      it('policy with input level secret vars', () => {
        const packagePolicy = {
          inputs: [
            {
              type: 'foo',
              policy_template: 'pkgPolicy1',
              vars: {
                'input-secret-1': {
                  value: 'input-secret-1-val',
                },
                'input-secret-2': {
                  value: 'input-secret-2-val',
                },
                'input-multi-secret': {
                  value: ['input-multi-secret-val1', 'input-multi-secret-val2'],
                },
              },
              streams: [],
            },
          ],
        } as unknown as NewPackagePolicy;

        expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
          {
            path: ['inputs', '0', 'vars', 'input-secret-1'],
            value: { value: 'input-secret-1-val' },
          },
          {
            path: ['inputs', '0', 'vars', 'input-secret-2'],
            value: { value: 'input-secret-2-val' },
          },
          {
            path: ['inputs', '0', 'vars', 'input-multi-secret'],
            value: { value: ['input-multi-secret-val1', 'input-multi-secret-val2'] },
          },
        ]);
      });
      it('stream level secret vars', () => {
        const packagePolicy = {
          inputs: [
            {
              type: 'foo',
              policy_template: 'pkgPolicy1',
              streams: [
                {
                  data_stream: {
                    dataset: 'somedataset',
                    type: 'logs',
                  },
                  vars: {
                    'stream-secret-1': {
                      value: 'stream-secret-1-value',
                    },
                    'stream-secret-2': {
                      value: 'stream-secret-2-value',
                    },
                    'stream-multi-secret': {
                      value: ['stream-multi-secret-val1', 'stream-multi-secret-val2'],
                    },
                  },
                },
              ],
            },
          ],
        } as unknown as NewPackagePolicy;

        expect(getPolicySecretPaths(packagePolicy, mockIntegrationPackage)).toEqual([
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'stream-secret-1'],
            value: { value: 'stream-secret-1-value' },
          },
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'stream-secret-2'],
            value: { value: 'stream-secret-2-value' },
          },
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'stream-multi-secret'],
            value: { value: ['stream-multi-secret-val1', 'stream-multi-secret-val2'] },
          },
        ]);
      });

      it('variables with dot notated names', () => {
        const mockPackageWithDotNotatedVariables = {
          name: 'mock-dot-package',
          title: 'Mock dot package',
          version: '0.0.0',
          description: 'description',
          type: 'integration',
          status: 'not_installed',
          vars: [
            { name: 'dot-notation.pkg-secret-1', type: 'text', secret: true },
            { name: 'dot-notation.pkg-secret-2', type: 'text', secret: true },
          ],
          data_streams: [
            {
              dataset: 'somedataset',
              streams: [
                {
                  input: 'foo',
                  title: 'Foo',
                  vars: [
                    { name: 'dot-notation.stream-secret-1', type: 'text', secret: true },
                    { name: 'dot-notation.stream-secret-2', type: 'text', secret: true },
                  ],
                },
              ],
            },
          ],
          policy_templates: [
            {
              name: 'pkgPolicy1',
              title: 'Package policy 1',
              description: 'test package policy',
              inputs: [
                {
                  type: 'foo',
                  title: 'Foo',
                  vars: [
                    {
                      default: 'foo-input-var-value',
                      name: 'dot-notation.foo-input-var-name',
                      type: 'text',
                    },
                    {
                      name: 'dot-notation.input-secret-1',
                      type: 'text',
                      secret: true,
                    },
                    {
                      name: 'dot-notation.input-secret-2',
                      type: 'text',
                      secret: true,
                    },
                    { name: 'dot-notation.foo-input3-var-name', type: 'text', multi: true },
                  ],
                },
              ],
            },
          ],
        } as unknown as PackageInfo;
        const policy = {
          vars: {
            'dot-notation.pkg-secret-1': {
              value: 'Package level secret 1',
            },
            'dot-notation.pkg-secret-2': {
              value: 'Package level secret 2',
            },
          },
          inputs: [
            {
              type: 'foo',
              policy_template: 'pkgPolicy1',
              enabled: false,
              vars: {
                'dot-notation.foo-input-var-name': { value: 'foo' },
                'dot-notation.input-secret-1': { value: 'Input level secret 1' },
                'dot-notation.input-secret-2': { value: 'Input level secret 2' },
                'dot-notation.input3-var-name': { value: 'bar' },
              },
              streams: [
                {
                  data_stream: { type: 'foo', dataset: 'somedataset' },
                  vars: {
                    'dot-notation.stream-secret-1': { value: 'Stream secret 1' },
                    'dot-notation.stream-secret-2': { value: 'Stream secret 2' },
                  },
                },
              ],
            },
          ],
        };

        expect(
          getPolicySecretPaths(
            policy as unknown as NewPackagePolicy,
            mockPackageWithDotNotatedVariables as unknown as PackageInfo
          )
        ).toEqual([
          {
            path: ['vars', 'dot-notation.pkg-secret-1'],
            value: { value: 'Package level secret 1' },
          },
          {
            path: ['vars', 'dot-notation.pkg-secret-2'],
            value: { value: 'Package level secret 2' },
          },
          {
            path: ['inputs', '0', 'vars', 'dot-notation.input-secret-1'],
            value: { value: 'Input level secret 1' },
          },
          {
            path: ['inputs', '0', 'vars', 'dot-notation.input-secret-2'],
            value: { value: 'Input level secret 2' },
          },
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'dot-notation.stream-secret-1'],
            value: { value: 'Stream secret 1' },
          },
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'dot-notation.stream-secret-2'],
            value: { value: 'Stream secret 2' },
          },
        ]);
      });
    });

    describe('integration package with multiple policy templates (e.g AWS)', () => {
      const miniAWsPackage = {
        name: 'aws',
        title: 'AWS',
        version: '0.5.3',
        release: 'beta',
        description: 'AWS Integration',
        type: 'integration',
        policy_templates: [
          {
            name: 'billing',
            title: 'AWS Billing',
            description: 'Collect AWS billing metrics',
            data_streams: ['billing'],
            inputs: [
              {
                type: 'aws/metrics',
                title: 'Collect billing metrics',
                description: 'Collect billing metrics',
                input_group: 'metrics',
                vars: [
                  {
                    name: 'password',
                    type: 'text',
                    secret: true,
                  },
                ],
              },
            ],
          },
          {
            name: 'cloudtrail',
            title: 'AWS Cloudtrail',
            description: 'Collect logs from AWS Cloudtrail',
            data_streams: ['cloudtrail'],
            inputs: [
              {
                type: 's3',
                title: 'Collect logs from Cloudtrail service',
                description: 'Collecting Cloudtrail logs using S3 input',
                input_group: 'logs',
                vars: [
                  {
                    name: 'password',
                    type: 'text',
                    secret: true,
                  },
                ],
              },
              {
                type: 'httpjson',
                title: 'Collect logs from third-party REST API (experimental)',
                description: 'Collect logs from third-party REST API (experimental)',
                input_group: 'logs',
                vars: [
                  {
                    name: 'password',
                    type: 'text',
                    secret: true,
                  },
                ],
              },
            ],
          },
        ],
        vars: [
          {
            name: 'secret_access_key',
            type: 'text',
            title: 'Secret Access Key',
            multi: false,
            required: false,
            show_user: false,
            secret: true,
          },
        ],
        data_streams: [
          {
            type: 'metrics',
            dataset: 'aws.billing',
            title: 'AWS billing metrics',
            release: 'beta',
            streams: [
              {
                input: 'aws/metrics',
                vars: [
                  {
                    name: 'password',
                    type: 'text',
                    secret: true,
                  },
                ],
                template_path: 'stream.yml.hbs',
                title: 'AWS Billing metrics',
                description: 'Collect AWS billing metrics',
                enabled: true,
              },
            ],
            package: 'aws',
            path: 'billing',
          },
          {
            type: 'logs',
            dataset: 'aws.cloudtrail',
            title: 'AWS CloudTrail logs',
            release: 'beta',
            ingest_pipeline: 'default',
            streams: [
              {
                input: 's3',
                vars: [
                  {
                    name: 'password',
                    type: 'text',
                    secret: true,
                  },
                ],
                template_path: 's3.yml.hbs',
              },
              {
                input: 'httpjson',
                vars: [
                  {
                    name: 'username',
                    type: 'text',
                    title: 'Splunk REST API Username',
                    multi: false,
                    required: true,
                    show_user: true,
                  },
                  {
                    name: 'password',
                    type: 'password',
                    title: 'Splunk REST API Password',
                    multi: false,
                    required: true,
                    show_user: true,
                    secret: true,
                  },
                ],
                template_path: 'httpjson.yml.hbs',
              },
            ],
            package: 'aws',
            path: 'cloudtrail',
          },
        ],
      } as PackageInfo;
      it('single policy with package + input + stream level secret var', () => {
        const policy = {
          vars: {
            secret_access_key: {
              value: 'my_secret_access_key',
            },
          },
          inputs: [
            {
              type: 'aws/metrics',
              policy_template: 'billing',
              enabled: true,
              vars: {
                password: { value: 'billing_input_password', type: 'text' },
              },
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'metrics', dataset: 'aws.billing' },
                  vars: {
                    password: { value: 'billing_stream_password', type: 'text' },
                  },
                },
              ],
            },
          ],
        };
        expect(
          getPolicySecretPaths(
            policy as unknown as NewPackagePolicy,
            miniAWsPackage as unknown as PackageInfo
          )
        ).toEqual([
          {
            path: ['vars', 'secret_access_key'],
            value: {
              value: 'my_secret_access_key',
            },
          },
          {
            path: ['inputs', '0', 'vars', 'password'],
            value: {
              type: 'text',
              value: 'billing_input_password',
            },
          },
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'password'],
            value: {
              type: 'text',
              value: 'billing_stream_password',
            },
          },
        ]);
      });
      it('double policy with package + input + stream level secret var', () => {
        const policy = {
          vars: {
            secret_access_key: {
              value: 'my_secret_access_key',
            },
          },
          inputs: [
            {
              type: 'httpjson',
              policy_template: 'cloudtrail',
              enabled: false,
              vars: {
                password: { value: 'cloudtrail_httpjson_input_password' },
              },
              streams: [
                {
                  data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
                  vars: {
                    username: { value: 'hop_dev' },
                    password: { value: 'cloudtrail_httpjson_stream_password' },
                  },
                },
              ],
            },
            {
              type: 's3',
              policy_template: 'cloudtrail',
              enabled: true,
              vars: {
                password: { value: 'cloudtrail_s3_input_password' },
              },
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'aws.cloudtrail' },
                  vars: {
                    password: { value: 'cloudtrail_s3_stream_password' },
                  },
                },
              ],
            },
          ],
        };

        expect(
          getPolicySecretPaths(
            policy as unknown as NewPackagePolicy,
            miniAWsPackage as unknown as PackageInfo
          )
        ).toEqual([
          {
            path: ['vars', 'secret_access_key'],
            value: {
              value: 'my_secret_access_key',
            },
          },
          {
            path: ['inputs', '0', 'vars', 'password'],
            value: {
              value: 'cloudtrail_httpjson_input_password',
            },
          },
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'password'],
            value: {
              value: 'cloudtrail_httpjson_stream_password',
            },
          },
          {
            path: ['inputs', '1', 'vars', 'password'],
            value: {
              value: 'cloudtrail_s3_input_password',
            },
          },
          {
            path: ['inputs', '1', 'streams', '0', 'vars', 'password'],
            value: {
              value: 'cloudtrail_s3_stream_password',
            },
          },
        ]);
      });
    });

    describe('input package', () => {
      const mockInputPackage = {
        name: 'log',
        version: '2.0.0',
        description: 'Collect custom logs with Elastic Agent.',
        title: 'Custom Logs',
        format_version: '2.6.0',
        owner: {
          github: 'elastic/elastic-agent-data-plane',
        },
        type: 'input',
        categories: ['custom', 'custom_logs'],
        conditions: {},
        icons: [],
        policy_templates: [
          {
            name: 'logs',
            title: 'Custom log file',
            description: 'Collect your custom log files.',
            multiple: true,
            input: 'logfile',
            type: 'logs',
            template_path: 'input.yml.hbs',
            vars: [
              {
                name: 'paths',
                required: true,
                title: 'Log file path',
                description: 'Path to log files to be collected',
                type: 'text',
                multi: true,
              },
              {
                name: 'data_stream.dataset',
                required: true,
                title: 'Dataset name',
                description:
                  "Set the name for your dataset. Changing the dataset will send the data to a different index. You can't use `-` in the name of a dataset and only valid characters for [Elasticsearch index names](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html).\n",
                type: 'text',
              },
              {
                name: 'secret-1',
                type: 'text',
                secret: true,
              },
              {
                name: 'secret-2',
                type: 'text',
                secret: true,
              },
            ],
          },
        ],
      };
      it('template level vars', () => {
        const policy = {
          inputs: [
            {
              type: 'logfile',
              policy_template: 'logs',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: {
                    type: 'logs',
                    dataset: 'log.logs',
                  },
                  vars: {
                    paths: {
                      value: ['/tmp/test.log'],
                    },
                    'data_stream.dataset': {
                      value: 'hello',
                    },
                    'secret-1': {
                      value: 'secret-1-value',
                    },
                    'secret-2': {
                      value: 'secret-2-value',
                    },
                  },
                },
              ],
            },
          ],
        };

        expect(
          getPolicySecretPaths(
            policy as unknown as NewPackagePolicy,
            mockInputPackage as unknown as PackageInfo
          )
        ).toEqual([
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'secret-1'],
            value: {
              value: 'secret-1-value',
            },
          },
          {
            path: ['inputs', '0', 'streams', '0', 'vars', 'secret-2'],
            value: {
              value: 'secret-2-value',
            },
          },
        ]);
      });
    });
  });

  describe('diffSecretPaths', () => {
    it('should return empty array if no secrets', () => {
      expect(diffSecretPaths([], [])).toEqual({
        toCreate: [],
        toDelete: [],
        noChange: [],
      });
    });
    it('should return empty array if single secret not changed', () => {
      const paths = [
        {
          path: ['somepath'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-1',
            },
          },
        },
      ];
      expect(diffSecretPaths(paths, paths)).toEqual({
        toCreate: [],
        toDelete: [],
        noChange: paths,
      });
    });
    it('should return empty array if multiple secrets not changed', () => {
      const paths = [
        {
          path: ['somepath'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-1',
            },
          },
        },
        {
          path: ['somepath2'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-2',
            },
          },
        },
        {
          path: ['somepath3'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-3',
            },
          },
        },
        {
          path: ['somepath4'],
          value: {
            value: {
              isSecretRef: true,
              ids: ['secret-4-1', 'secret-4-2'],
            },
          },
        },
      ];

      expect(diffSecretPaths(paths, paths.slice().reverse())).toEqual({
        toCreate: [],
        toDelete: [],
        noChange: paths,
      });
    });
    it('single secret modified', () => {
      const paths1 = [
        {
          path: ['somepath1'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-1',
            },
          },
        },
        {
          path: ['somepath2'],
          value: {
            value: { isSecretRef: true, id: 'secret-2' },
          },
        },
      ];

      const paths2 = [
        paths1[0],
        {
          path: ['somepath2'],
          value: { value: 'newvalue' },
        },
      ];

      expect(diffSecretPaths(paths1, paths2)).toEqual({
        toCreate: [
          {
            path: ['somepath2'],
            value: { value: 'newvalue' },
          },
        ],
        toDelete: [
          {
            path: ['somepath2'],
            value: {
              value: {
                isSecretRef: true,
                id: 'secret-2',
              },
            },
          },
        ],
        noChange: [paths1[0]],
      });
    });
    it('multiple secret modified', () => {
      const paths1 = [
        {
          path: ['somepath1'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-1',
            },
          },
        },
        {
          path: ['somepath2'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-2',
            },
          },
        },
        {
          path: ['somepath3'],
          value: {
            value: {
              isSecretRef: true,
              ids: ['secret-3-1', 'secret-3-2'],
            },
          },
        },
      ];

      const paths2 = [
        {
          path: ['somepath1'],
          value: { value: 'newvalue1' },
        },
        {
          path: ['somepath2'],
          value: { value: 'newvalue2' },
        },
        {
          path: ['somepath3'],
          value: { value: ['newvalue3-1', 'newvalue3-2'] },
        },
      ];

      expect(diffSecretPaths(paths1, paths2)).toEqual({
        toCreate: [
          {
            path: ['somepath1'],
            value: { value: 'newvalue1' },
          },
          {
            path: ['somepath2'],
            value: { value: 'newvalue2' },
          },
          {
            path: ['somepath3'],
            value: { value: ['newvalue3-1', 'newvalue3-2'] },
          },
        ],
        toDelete: [
          {
            path: ['somepath1'],
            value: {
              value: {
                isSecretRef: true,
                id: 'secret-1',
              },
            },
          },
          {
            path: ['somepath2'],
            value: {
              value: {
                isSecretRef: true,
                id: 'secret-2',
              },
            },
          },
          {
            path: ['somepath3'],
            value: {
              value: {
                isSecretRef: true,
                ids: ['secret-3-1', 'secret-3-2'],
              },
            },
          },
        ],
        noChange: [],
      });
    });

    it('single secret added', () => {
      const paths1 = [
        {
          path: ['somepath1'],
          value: {
            value: {
              isSecretRef: true,
              id: 'secret-1',
            },
          },
        },
      ];

      const paths2 = [
        paths1[0],
        {
          path: ['somepath2'],
          value: { value: 'newvalue' },
        },
      ];

      expect(diffSecretPaths(paths1, paths2)).toEqual({
        toCreate: [
          {
            path: ['somepath2'],
            value: { value: 'newvalue' },
          },
        ],
        toDelete: [],
        noChange: [paths1[0]],
      });
    });
  });

  describe('extractAndWriteSecrets', () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();

    esClientMock.transport.request.mockImplementation(async (req) => {
      return {
        id: uuidv4(),
      };
    });

    beforeEach(() => {
      esClientMock.transport.request.mockClear();
    });

    const mockIntegrationPackage = {
      name: 'mock-package',
      title: 'Mock package',
      version: '0.0.0',
      description: 'description',
      type: 'integration',
      status: 'not_installed',
      vars: [
        { name: 'pkg-secret-1', type: 'text', secret: true, required: true },
        { name: 'pkg-secret-2', type: 'text', secret: true, required: false },
        { name: 'dot-notation.pkg-secret-3', type: 'text', secret: true, required: false },
        { name: 'pkg-multi-secret', type: 'text', secret: true, multi: true },
      ],
      data_streams: [
        {
          dataset: 'somedataset',
          streams: [
            {
              input: 'foo',
              title: 'Foo',
              vars: [
                {
                  name: 'dot-notation.stream-secret-1',
                  type: 'text',
                  secret: true,
                  required: false,
                },
                {
                  name: 'stream-multi-secret',
                  type: 'text',
                  secret: true,
                  multi: true,
                },
              ],
            },
          ],
        },
      ],
      policy_templates: [
        {
          name: 'pkgPolicy1',
          title: 'Package policy 1',
          description: 'test package policy',
          inputs: [
            {
              type: 'foo',
              title: 'Foo',
              vars: [
                {
                  name: 'dot-notation.input-secret-1',
                  type: 'text',
                  secret: true,
                  required: false,
                },
                {
                  name: 'input-multi-secret',
                  type: 'text',
                  secret: true,
                  multi: true,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    describe('when only required secret value is provided', () => {
      it('returns single secret reference for required secret', async () => {
        const mockPackagePolicy = {
          vars: {
            'pkg-secret-1': {},
            'pkg-secret-2': {
              value: 'pkg-secret-2-val',
            },
            'dot-notation.stream.pkg-secret-3': {},
          },
          inputs: [],
        } as unknown as NewPackagePolicy;

        const result = await extractAndWriteSecrets({
          packagePolicy: mockPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(1);
        expect(result.secretReferences).toHaveLength(1);
      });
    });

    describe('when both required and optional secret values are provided', () => {
      it('returns secret reference for both required and optional secret', async () => {
        const mockPackagePolicy = {
          vars: {
            'pkg-secret-1': {
              value: 'pkg-secret-1-val',
            },
            'pkg-secret-2': {
              value: 'pkg-secret-2-val',
            },
          },
          inputs: [],
        } as unknown as NewPackagePolicy;

        const result = await extractAndWriteSecrets({
          packagePolicy: mockPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(2);
        expect(result.secretReferences).toHaveLength(2);
      });
    });

    describe('when variable name uses dot notation', () => {
      it('places variable at the right path', async () => {
        const mockPackagePolicy = {
          vars: {
            'dot-notation.pkg-secret-3': {
              value: 'pkg-secret-3-val',
            },
          },
          inputs: [
            {
              type: 'foo',
              vars: {
                'dot-notation.input-secret-1': {
                  value: 'dot-notation-input-secret-1-val',
                },
              },
              streams: [
                {
                  data_stream: { type: 'foo', dataset: 'somedataset' },
                  vars: {
                    'dot-notation.stream-secret-1': {
                      value: 'dot-notation-stream-var-1-val',
                    },
                  },
                },
              ],
            },
          ],
        } as unknown as NewPackagePolicy;

        const result = await extractAndWriteSecrets({
          packagePolicy: mockPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(3);
        expect(result.secretReferences).toHaveLength(3);

        expect(result.packagePolicy.vars!['dot-notation.pkg-secret-3'].value.id).toBeTruthy();
        expect(result.packagePolicy.vars!['dot-notation.pkg-secret-3'].value.isSecretRef).toBe(
          true
        );

        expect(
          result.packagePolicy.inputs[0].vars!['dot-notation.input-secret-1'].value.id
        ).toBeTruthy();
        expect(
          result.packagePolicy.inputs[0].vars!['dot-notation.input-secret-1'].value.isSecretRef
        ).toBe(true);

        expect(
          result.packagePolicy.inputs[0].streams[0].vars!['dot-notation.stream-secret-1'].value.id
        ).toBeTruthy();
        expect(
          result.packagePolicy.inputs[0].streams[0].vars!['dot-notation.stream-secret-1'].value
            .isSecretRef
        ).toBe(true);
      });
    });

    describe('when secrets have multiple values', () => {
      it('handles multi-value secrets correctly', async () => {
        const mockPackagePolicy = {
          vars: {
            'pkg-multi-secret': {
              value: ['multi-secret-val1', 'multi-secret-val2'],
            },
          },
          inputs: [
            {
              type: 'foo',
              vars: {
                'input-multi-secret': {
                  value: ['input-multi-secret-val1', 'input-multi-secret-val2'],
                },
              },
              streams: [
                {
                  data_stream: { type: 'foo', dataset: 'somedataset' },
                  vars: {
                    'stream-multi-secret': {
                      value: ['stream-multi-secret-val1', 'stream-multi-secret-val2'],
                    },
                  },
                },
              ],
            },
          ],
        } as unknown as NewPackagePolicy;

        const result = await extractAndWriteSecrets({
          packagePolicy: mockPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(6);
        expect(result.secretReferences).toHaveLength(6);

        expect(result.packagePolicy.vars!['pkg-multi-secret'].value.ids).toHaveLength(2);
        expect(result.packagePolicy.vars!['pkg-multi-secret'].value.isSecretRef).toBe(true);

        expect(result.packagePolicy.inputs[0].vars!['input-multi-secret'].value.ids).toHaveLength(
          2
        );
        expect(result.packagePolicy.inputs[0].vars!['input-multi-secret'].value.isSecretRef).toBe(
          true
        );

        expect(
          result.packagePolicy.inputs[0].streams[0].vars!['stream-multi-secret'].value.ids
        ).toHaveLength(2);
        expect(
          result.packagePolicy.inputs[0].streams[0].vars!['stream-multi-secret'].value.isSecretRef
        ).toBe(true);
      });
    });
  });

  describe('extractAndUpdateSecrets', () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();

    esClientMock.transport.request.mockImplementation(async (req) => {
      return {
        id: uuidv4(),
      };
    });

    beforeEach(() => {
      esClientMock.transport.request.mockClear();
    });

    const mockIntegrationPackage = {
      name: 'mock-package',
      title: 'Mock package',
      version: '0.0.0',
      description: 'description',
      type: 'integration',
      status: 'not_installed',
      vars: [
        { name: 'pkg-secret-1', type: 'text', secret: true, required: true },
        { name: 'pkg-secret-2', type: 'text', secret: true, required: false },
        { name: 'dot-notation.pkg-secret-3', type: 'text', secret: true, required: false },
        { name: 'pkg-multi-secret', type: 'text', secret: true, multi: true },
      ],
      data_streams: [
        {
          dataset: 'somedataset',
          streams: [
            {
              input: 'foo',
              title: 'Foo',
              vars: [
                {
                  name: 'dot-notation.stream-secret-1',
                  type: 'text',
                  secret: true,
                  required: false,
                },
                {
                  name: 'stream-multi-secret',
                  type: 'text',
                  secret: true,
                  multi: true,
                },
              ],
            },
          ],
        },
      ],
      policy_templates: [
        {
          name: 'pkgPolicy1',
          title: 'Package policy 1',
          description: 'test package policy',
          inputs: [
            {
              type: 'foo',
              title: 'Foo',
              vars: [
                {
                  name: 'dot-notation.input-secret-1',
                  type: 'text',
                  secret: true,
                  required: false,
                },
                {
                  name: 'input-multi-secret',
                  type: 'text',
                  secret: true,
                  multi: true,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    describe('when only required secret value is provided', () => {
      it('returns single secret reference for required secret', async () => {
        const oldPackagePolicy = {
          vars: {
            'pkg-secret-1': {
              value: 'pkg-secret-1-val',
            },
            'pkg-secret-2': {},
            'dot-notation.pkg-secret-3': {},
          },
          inputs: [],
        } as unknown as PackagePolicy;

        const mockPackagePolicy = {
          vars: {
            'pkg-secret-1': {
              value: 'pkg-secret-1-val-update',
            },
            'pkg-secret-2': {},
          },
          inputs: [],
        } as unknown as UpdatePackagePolicy;

        const result = await extractAndUpdateSecrets({
          oldPackagePolicy,
          packagePolicyUpdate: mockPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(1);
        expect(result.secretReferences).toHaveLength(1);
        expect((result.packagePolicyUpdate.vars as any)['pkg-secret-1'].value.isSecretRef).toEqual(
          true
        );
        expect((result.packagePolicyUpdate.vars as any)['pkg-secret-2'].value).toBeUndefined();
      });
    });

    describe('when both required and optional secret values are provided', () => {
      it('returns secret reference for both required and optional secret', async () => {
        const oldPackagePolicy = {
          vars: {
            'pkg-secret-1': {
              value: 'pkg-secret-1-val',
            },
            'pkg-secret-2': {
              value: { id: '1234', isSecretRef: true },
            },
          },
          inputs: [],
        } as unknown as PackagePolicy;

        const mockPackagePolicy = {
          vars: {
            'pkg-secret-1': {
              value: 'pkg-secret-1-val-update',
            },
            'pkg-secret-2': {
              value: 'pkg-secret-2-val-update',
            },
          },
          inputs: [],
        } as unknown as UpdatePackagePolicy;

        const result = await extractAndUpdateSecrets({
          oldPackagePolicy,
          packagePolicyUpdate: mockPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(2);
        expect(result.secretReferences).toHaveLength(2);
        expect((result.packagePolicyUpdate.vars as any)['pkg-secret-1'].value.isSecretRef).toEqual(
          true
        );
        expect((result.packagePolicyUpdate.vars as any)['pkg-secret-2'].value.isSecretRef).toEqual(
          true
        );
      });
    });

    describe('when variable name uses dot notation', () => {
      it('places variable at the right path', async () => {
        const oldPackagePolicy = {
          vars: {
            'dot-notation.pkg-secret-3': {
              value: { id: 123, isSecretRef: true },
            },
          },
          inputs: [
            {
              type: 'foo',
              vars: {
                'dot-notation.input-secret-1': {
                  value: { id: 12234, isSecretRef: true },
                },
              },
              streams: [],
            },
          ],
        } as unknown as PackagePolicy;

        const updatedPackagePolicy = {
          vars: {
            'dot-notation.pkg-secret-3': {
              value: 'pkg-secret-3-val',
            },
          },
          inputs: [
            {
              type: 'foo',
              vars: {
                'dot-notation.input-secret-1': {
                  value: 'dot-notation-input-secret-1-val',
                },
              },
              streams: [
                {
                  data_stream: { type: 'foo', dataset: 'somedataset' },
                  vars: {
                    'dot-notation.stream-secret-1': {
                      value: 'dot-notation-stream-var-1-val',
                    },
                  },
                },
              ],
            },
          ],
        } as unknown as UpdatePackagePolicy;

        const result = await extractAndUpdateSecrets({
          oldPackagePolicy,
          packagePolicyUpdate: updatedPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(3);
        expect(result.secretReferences).toHaveLength(3);

        expect(result.packagePolicyUpdate.vars!['dot-notation.pkg-secret-3'].value.id).toBeTruthy();
        expect(
          result.packagePolicyUpdate.vars!['dot-notation.pkg-secret-3'].value.isSecretRef
        ).toBe(true);

        expect(
          result.packagePolicyUpdate.inputs[0].vars!['dot-notation.input-secret-1'].value.id
        ).toBeTruthy();
        expect(
          result.packagePolicyUpdate.inputs[0].vars!['dot-notation.input-secret-1'].value
            .isSecretRef
        ).toBe(true);

        expect(
          result.packagePolicyUpdate.inputs[0].streams[0].vars!['dot-notation.stream-secret-1']
            .value.id
        ).toBeTruthy();
        expect(
          result.packagePolicyUpdate.inputs[0].streams[0].vars!['dot-notation.stream-secret-1']
            .value.isSecretRef
        ).toBe(true);

        expect(result.secretsToDelete).toHaveLength(2);
      });
    });

    describe('when secrets have multiple values', () => {
      it('handles multi-value secrets correctly', async () => {
        const oldPackagePolicy = {
          vars: {
            'pkg-multi-secret': {
              value: { ids: ['id1', 'id2'], isSecretRef: true },
            },
          },
          inputs: [
            {
              type: 'foo',
              vars: {
                'input-multi-secret': {
                  value: { ids: ['id3', 'id4'], isSecretRef: true },
                },
              },
              streams: [
                {
                  data_stream: { type: 'foo', dataset: 'somedataset' },
                  vars: {
                    'stream-multi-secret': {
                      value: { ids: ['id5', 'id6'], isSecretRef: true },
                    },
                  },
                },
              ],
            },
          ],
        } as unknown as PackagePolicy;

        const updatedPackagePolicy = {
          vars: {
            'pkg-multi-secret': {
              value: ['multi-secret-val1', 'multi-secret-val2'],
            },
          },
          inputs: [
            {
              type: 'foo',
              vars: {
                'input-multi-secret': {
                  value: ['input-multi-secret-val1', 'input-multi-secret-val2'],
                },
              },
              streams: [
                {
                  data_stream: { type: 'foo', dataset: 'somedataset' },
                  vars: {
                    'stream-multi-secret': {
                      value: ['stream-multi-secret-val1', 'stream-multi-secret-val2'],
                    },
                  },
                },
              ],
            },
          ],
        } as unknown as UpdatePackagePolicy;

        const result = await extractAndUpdateSecrets({
          oldPackagePolicy,
          packagePolicyUpdate: updatedPackagePolicy,
          packageInfo: mockIntegrationPackage,
          esClient: esClientMock,
        });

        expect(esClientMock.transport.request).toHaveBeenCalledTimes(6);
        expect(result.secretReferences).toHaveLength(6);

        expect(result.packagePolicyUpdate.vars!['pkg-multi-secret'].value.ids).toHaveLength(2);
        expect(result.packagePolicyUpdate.vars!['pkg-multi-secret'].value.isSecretRef).toBe(true);

        expect(
          result.packagePolicyUpdate.inputs[0].vars!['input-multi-secret'].value.ids
        ).toHaveLength(2);
        expect(
          result.packagePolicyUpdate.inputs[0].vars!['input-multi-secret'].value.isSecretRef
        ).toBe(true);

        expect(
          result.packagePolicyUpdate.inputs[0].streams[0].vars!['stream-multi-secret'].value.ids
        ).toHaveLength(2);
        expect(
          result.packagePolicyUpdate.inputs[0].streams[0].vars!['stream-multi-secret'].value
            .isSecretRef
        ).toBe(true);

        expect(result.secretsToDelete).toHaveLength(6);
      });
    });
  });

  describe('diffSOSecretPaths', () => {
    const paths1 = [
      {
        path: 'somepath1',
        value: {
          id: 'secret-1',
        },
      },
      {
        path: 'somepath2',
        value: {
          id: 'secret-2',
        },
      },
    ];

    const paths2 = [
      paths1[0],
      {
        path: 'somepath2',
        value: 'newvalue',
      },
    ];

    it('should return empty array if no secrets', () => {
      expect(diffSOSecretPaths([], [])).toEqual({
        toCreate: [],
        toDelete: [],
        noChange: [],
      });
    });
    it('should return empty array if single secret not changed', () => {
      const paths = [
        {
          path: 'somepath',
          value: {
            id: 'secret-1',
          },
        },
      ];
      expect(diffSOSecretPaths(paths, paths)).toEqual({
        toCreate: [],
        toDelete: [],
        noChange: paths,
      });
    });
    it('should return empty array if multiple secrets not changed', () => {
      const paths = [
        {
          path: 'somepath',
          value: {
            id: 'secret-1',
          },
        },
        {
          path: 'somepath2',
          value: {
            id: 'secret-2',
          },
        },
        {
          path: 'somepath3',
          value: {
            id: 'secret-3',
          },
        },
      ];

      expect(diffSOSecretPaths(paths, paths.slice().reverse())).toEqual({
        toCreate: [],
        toDelete: [],
        noChange: paths,
      });
    });
    it('single secret modified', () => {
      expect(diffSOSecretPaths(paths1, paths2)).toEqual({
        toCreate: [
          {
            path: 'somepath2',
            value: 'newvalue',
          },
        ],
        toDelete: [
          {
            path: 'somepath2',
            value: {
              id: 'secret-2',
            },
          },
        ],
        noChange: [paths1[0]],
      });
    });
    it('double secret modified', () => {
      const pathsDouble1 = [
        {
          path: 'somepath1',
          value: {
            id: 'secret-1',
          },
        },
        {
          path: 'somepath2',
          value: {
            id: 'secret-2',
          },
        },
      ];

      const pathsDouble2 = [
        {
          path: 'somepath1',
          value: 'newvalue1',
        },
        {
          path: 'somepath2',
          value: 'newvalue2',
        },
      ];

      expect(diffSOSecretPaths(pathsDouble1, pathsDouble2)).toEqual({
        toCreate: [
          {
            path: 'somepath1',
            value: 'newvalue1',
          },
          {
            path: 'somepath2',
            value: 'newvalue2',
          },
        ],
        toDelete: [
          {
            path: 'somepath1',
            value: {
              id: 'secret-1',
            },
          },
          {
            path: 'somepath2',
            value: {
              id: 'secret-2',
            },
          },
        ],
        noChange: [],
      });
    });
    it('single secret added', () => {
      const pathsSingle1 = [
        {
          path: 'somepath1',
          value: {
            id: 'secret-1',
          },
        },
      ];

      const pathsSingle2 = [
        paths1[0],
        {
          path: 'somepath2',
          value: 'newvalue',
        },
      ];

      expect(diffSOSecretPaths(pathsSingle1, pathsSingle2)).toEqual({
        toCreate: [
          {
            path: 'somepath2',
            value: 'newvalue',
          },
        ],
        toDelete: [],
        noChange: [paths1[0]],
      });
    });
  });

  describe('Outputs functions', () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();

    esClientMock.transport.request.mockImplementation(async (req) => {
      return {
        id: uuidv4(),
      };
    });

    beforeEach(() => {
      esClientMock.transport.request.mockClear();
    });
    const remoteEsOutput = {
      name: 'Remote es output',
      type: 'remote_elasticsearch',
      hosts: ['http://192.168.178.216:9200'],
      is_default: false,
      is_default_monitoring: false,
      preset: 'balanced',
      config_yaml: '',
      secrets: {
        service_token: 'token1',
        ssl: {
          key: 'key1',
        },
      },
      proxy_id: null,
    } as any;

    describe('extractAndWriteOutputSecrets', () => {
      it('should create secrets', async () => {
        const result = await extractAndWriteOutputSecrets({
          output: remoteEsOutput,
          esClient: esClientMock,
        });

        expect(result.output).toEqual({
          ...remoteEsOutput,
          secrets: {
            service_token: {
              id: expect.any(String),
            },
            ssl: {
              key: {
                id: expect.any(String),
              },
            },
          },
        });
        expect(result.secretReferences).toEqual([
          { id: expect.anything() },
          { id: expect.anything() },
        ]);
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              body: {
                value: 'token1',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
          [
            {
              body: {
                value: 'key1',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });
    });
    describe('extractAndUpdateOutputSecrets', () => {
      it('should delete secret if type changed from kafka to remote es', async () => {
        const result = await extractAndUpdateOutputSecrets({
          oldOutput: {
            id: 'id1',
            name: 'kafka to remote es',
            is_default: false,
            is_default_monitoring: false,
            type: 'kafka',
            secrets: {
              password: {
                id: 'pass',
              },
            },
          },
          outputUpdate: {
            name: 'kafka to remote es',
            type: 'remote_elasticsearch',
            hosts: ['http://192.168.178.216:9200'],
            is_default: false,
            is_default_monitoring: false,
            preset: 'balanced',
            config_yaml: '',
            secrets: {
              service_token: 'token1',
            },
            proxy_id: null,
          },
          esClient: esClientMock,
        });

        expect(result.secretsToDelete).toEqual([{ id: 'pass' }]);
      });

      it('should delete secret if type changed from remote es to kafka', async () => {
        const result = await extractAndUpdateOutputSecrets({
          oldOutput: {
            id: 'id2',
            name: 'remote es to kafka',
            is_default: false,
            is_default_monitoring: false,
            type: 'remote_elasticsearch',
            secrets: {
              service_token: {
                id: 'token',
              },
            },
          },
          outputUpdate: {
            name: 'remote es to kafka',
            type: 'kafka',
            is_default: false,
            is_default_monitoring: false,
            preset: 'balanced',
            config_yaml: '',
            secrets: {
              password: 'pass',
            },
            proxy_id: null,
          },
          esClient: esClientMock,
        });

        expect(result.secretsToDelete).toEqual([{ id: 'token' }]);
      });

      it('should delete secret if secret is undefined in update', async () => {
        const result = await extractAndUpdateOutputSecrets({
          oldOutput: {
            id: 'logstash-id',
            name: 'logstash',
            type: 'logstash',
            is_default: false,
            is_default_monitoring: false,
            secrets: {
              ssl: {
                key: {
                  id: 'ssl-key-token',
                },
              },
            },
          },
          outputUpdate: {
            id: 'logstash-id',
            name: 'logstash',
            type: 'logstash',
            secrets: {
              ssl: undefined,
            },
            is_default: false,
            is_default_monitoring: false,
            proxy_id: null,
          },
          esClient: esClientMock,
        });

        expect(result.secretsToDelete).toEqual([{ id: 'ssl-key-token' }]);
      });
    });
    describe('deleteOutputSecrets', () => {
      it('should delete existing secrets', async () => {
        const outputWithSecrets = {
          ...remoteEsOutput,
          secrets: {
            ssl: {
              key: {
                id: '7jCKYZUBBY96FE7DX6L1',
              },
            },
            service_token: {
              id: 'WjCKYZ9BBY96FE7DH6P3',
            },
          },
        } as any;

        await deleteOutputSecrets({
          output: outputWithSecrets,
          esClient: esClientMock,
        });
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              method: 'DELETE',
              path: '/_fleet/secret/WjCKYZ9BBY96FE7DH6P3',
            },
          ],
          [
            {
              method: 'DELETE',
              path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L1',
            },
          ],
        ]);
      });

      it('should do nothing if there are no existing secrets', async () => {
        const outputWithoutSecrets = {
          id: 'id2',
          name: 'ES',
          is_default: false,
          is_default_monitoring: false,
          type: 'elasticsearch',
        } as any;

        await deleteOutputSecrets({
          output: outputWithoutSecrets,
          esClient: esClientMock,
        });
        expect(esClientMock.transport.request.mock.calls).toEqual([]);
      });
    });
  });

  describe('Fleet server hosts functions', () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();

    esClientMock.transport.request.mockImplementation(async (req) => {
      return {
        id: uuidv4(),
      };
    });

    beforeEach(() => {
      esClientMock.transport.request.mockClear();
    });
    const fleetServerHost = {
      id: 'id1',
      name: 'fleet server 1',
      host_urls: [],
      is_default: false,
      is_preconfigured: false,
      ssl: {
        certificate_authorities: ['cert authorities'],
        es_certificate_authorities: ['es cert authorities'],
        certificate: 'path/to/cert',
        es_certificate: 'path/to/EScert',
      },
      secrets: {
        ssl: {
          key: 'key1',
          es_key: 'key2',
        },
      },
    };

    describe('extractAndWriteFleetServerHostsSecrets', () => {
      it('should create new secrets', async () => {
        const res = await extractAndWriteFleetServerHostsSecrets({
          fleetServerHost,
          esClient: esClientMock,
        });
        expect(res.fleetServerHost).toEqual({
          ...fleetServerHost,
          secrets: {
            ssl: {
              es_key: {
                id: expect.any(String),
              },
              key: {
                id: expect.any(String),
              },
            },
          },
        });
        expect(res.secretReferences).toEqual([
          { id: expect.anything() },
          { id: expect.anything() },
        ]);
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              body: {
                value: 'key1',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
          [
            {
              body: {
                value: 'key2',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });
    });

    describe('extractAndUpdateFleetServerHostsSecrets', () => {
      it('should update existing secrets', async () => {
        const updatedFleetServerHost = {
          ...fleetServerHost,
          secrets: {
            ssl: {
              key: 'newkey1',
              es_key: 'newkey2',
            },
          },
        };
        const res = await extractAndUpdateFleetServerHostsSecrets({
          oldFleetServerHost: fleetServerHost,
          fleetServerHostUpdate: updatedFleetServerHost,
          esClient: esClientMock,
        });
        expect(res.fleetServerHostUpdate).toEqual({
          ...fleetServerHost,
          secrets: {
            ssl: {
              es_key: {
                id: expect.any(String),
              },
              key: {
                id: expect.any(String),
              },
            },
          },
        });
        expect(res.secretReferences).toEqual([
          { id: expect.anything() },
          { id: expect.anything() },
        ]);
        expect(res.secretsToDelete).toEqual([{ id: undefined }, { id: undefined }]);
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              body: {
                value: 'newkey1',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
          [
            {
              body: {
                value: 'newkey2',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });
    });
    describe('deleteFleetServerHostsSecrets', () => {
      it('should delete existing secrets', async () => {
        const fleetServerHostWithSecrets = {
          ...fleetServerHost,
          secrets: {
            ssl: {
              key: {
                id: '7jCKYZUBBY96FE7DX6L1',
              },
              es_key: {
                id: 'WjCKYZ9BBY96FE7DH6P3',
              },
            },
          },
        } as any;

        await deleteFleetServerHostsSecrets({
          fleetServerHost: fleetServerHostWithSecrets,
          esClient: esClientMock,
        });
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              method: 'DELETE',
              path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L1',
            },
          ],
          [
            {
              method: 'DELETE',
              path: '/_fleet/secret/WjCKYZ9BBY96FE7DH6P3',
            },
          ],
        ]);
      });

      it('should do nothing if there are no existing secrets', async () => {
        const fleetServerHostWithoutSecrets = {
          id: 'id1',
          name: 'fleet server 1',
          host_urls: [],
          is_default: false,
          is_preconfigured: false,
          ssl: {
            certificate_authorities: ['cert authorities'],
            es_certificate_authorities: ['es cert authorities'],
            certificate: 'path/to/cert',
            es_certificate: 'path/to/EScert',
            key: 'key1',
          },
        } as any;

        await deleteFleetServerHostsSecrets({
          fleetServerHost: fleetServerHostWithoutSecrets,
          esClient: esClientMock,
        });
        expect(esClientMock.transport.request.mock.calls).toEqual([]);
      });
    });
  });

  describe('Download source functions', () => {
    const esClientMock = elasticsearchServiceMock.createInternalClient();

    esClientMock.transport.request.mockImplementation(async (req) => {
      return {
        id: uuidv4(),
      };
    });

    beforeEach(() => {
      esClientMock.transport.request.mockClear();
    });

    const downloadSource = {
      id: 'id1',
      name: 'Agent binary',
      host: 'https://binary-source-test',
      is_default: false,
      ssl: {
        certificate_authorities: ['cert authorities'],
        certificate: 'path/to/cert',
      },
      secrets: {
        ssl: {
          key: 'key1',
        },
      },
    };
    describe('extractAndWriteDownloadSourcesSecrets', () => {
      it('should create new secrets', async () => {
        const res = await extractAndWriteDownloadSourcesSecrets({
          downloadSource,
          esClient: esClientMock,
        });
        expect(res.downloadSource).toEqual({
          ...downloadSource,
          secrets: {
            ssl: {
              key: {
                id: expect.any(String),
              },
            },
          },
        });
        expect(res.secretReferences).toEqual([{ id: expect.anything() }]);
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              body: {
                value: 'key1',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });
    });

    describe('extractAndUpdateDownloadSourceSecrets', () => {
      it('should update existing secrets', async () => {
        const updatedDownloadSource = {
          ...downloadSource,
          secrets: {
            ssl: {
              key: 'newkey1',
            },
          },
        };
        const res = await extractAndUpdateDownloadSourceSecrets({
          oldDownloadSource: downloadSource,
          downloadSourceUpdate: updatedDownloadSource,
          esClient: esClientMock,
        });
        expect(res.downloadSourceUpdate).toEqual({
          ...downloadSource,
          secrets: {
            ssl: {
              key: {
                id: expect.any(String),
              },
            },
          },
        });
        expect(res.secretReferences).toEqual([{ id: expect.anything() }]);
        expect(res.secretsToDelete).toEqual([{ id: undefined }]);
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              body: {
                value: 'newkey1',
              },
              method: 'POST',
              path: '/_fleet/secret',
            },
          ],
        ]);
      });
    });

    describe('deleteDownloadSourceSecrets', () => {
      it('should delete existing secrets', async () => {
        const downloadSourceWithSecrets = {
          ...downloadSource,
          secrets: {
            ssl: {
              key: {
                id: '7jCKYZUBBY96FE7DX6L1',
              },
            },
          },
        } as any;

        await deleteDownloadSourceSecrets({
          downloadSource: downloadSourceWithSecrets,
          esClient: esClientMock,
        });
        expect(esClientMock.transport.request.mock.calls).toEqual([
          [
            {
              method: 'DELETE',
              path: '/_fleet/secret/7jCKYZUBBY96FE7DX6L1',
            },
          ],
        ]);
      });
      it('should do nothing if there are no existing secrets', async () => {
        const downloadSourceWithoutSecrets = {
          id: 'id1',
          name: 'Agent binary',
          host: 'https://binary-source-test',
          is_default: false,
          ssl: {
            certificate_authorities: ['cert authorities'],
            certificate: 'path/to/cert',
            key: 'key1',
          },
        } as any;

        await deleteDownloadSourceSecrets({
          downloadSource: downloadSourceWithoutSecrets,
          esClient: esClientMock,
        });
        expect(esClientMock.transport.request.mock.calls).toEqual([]);
      });
    });
  });
});

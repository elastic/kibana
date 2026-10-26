/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { NEVER, firstValueFrom, of } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import type { CustomIntegrationsSetup } from '@kbn/custom-integrations-plugin/public';

import { allowedExperimentalValues } from '../common/experimental_features';

import {
  createCustomIntegrationsSearchProvider,
  createPackageSearchProvider,
  toSearchResult,
} from './search_provider';
import type { GetPackagesResponse } from './types';
import { ExperimentalFeaturesService } from './services/experimental_features';

jest.mock('./hooks/use_request/epm', () => {
  return {
    ...jest.requireActual('./hooks/use_request/epm'),
    sendGetPackages: jest.fn(),
  };
});

import { sendGetPackages } from './hooks';

const mockSendGetPackages = sendGetPackages as jest.Mock;

const testResponse: GetPackagesResponse['items'] = [
  {
    description: 'test',
    download: 'test',
    id: 'test',
    name: 'test',
    path: 'test',
    release: 'experimental',
    installationInfo: {} as any,
    status: 'installed',
    title: 'test',
    version: 'test',
  },
  {
    description: 'test1',
    download: 'test1',
    id: 'test1',
    name: 'test1',
    path: 'test1',
    release: 'ga',
    status: 'not_installed',
    title: 'test1',
    version: 'test1',
  },
  {
    description: 'testWithPolicyTemplate',
    download: 'testWithPolicyTemplate',
    id: 'testWithPolicyTemplate',
    name: 'testWithPolicyTemplate',
    path: 'testWithPolicyTemplate',
    release: 'ga',
    status: 'not_installed',
    title: 'testWithPolicyTemplate',
    version: 'testWithPolicyTemplate',
    policy_templates: [
      {
        description: 'testPolicyTemplate1',
        name: 'testPolicyTemplate1',
        icons: [
          {
            src: 'testPolicyTemplate1',
            path: 'testPolicyTemplate1',
          },
        ],
        title: 'testPolicyTemplate1',
        type: 'testPolicyTemplate1',
      },
      {
        description: 'testPolicyTemplate2',
        name: 'testPolicyTemplate2',
        icons: [
          {
            src: 'testPolicyTemplate2',
            path: 'testPolicyTemplate2',
          },
        ],
        title: 'testPolicyTemplate2',
        type: 'testPolicyTemplate2',
      },
    ],
  },
  {
    description: 'testWithASinglePolicyTemplate',
    download: 'testWithASinglePolicyTemplate',
    id: 'testWithASinglePolicyTemplate',
    name: 'testWithASinglePolicyTemplate',
    path: 'testWithASinglePolicyTemplate',
    release: 'ga',
    status: 'not_installed',
    title: 'testWithASinglePolicyTemplate',
    version: 'testWithASinglePolicyTemplate',
    policy_templates: [
      {
        description: 'singlePolicyTemplate1',
        name: 'singlePolicyTemplate1',
        icons: [
          {
            src: 'singlePolicyTemplate1',
            path: 'singlePolicyTemplate1',
          },
        ],
        title: 'singlePolicyTemplate1',
        type: 'singlePolicyTemplate1',
      },
    ],
  },
];

const testResponseBehaviorField: GetPackagesResponse['items'] = [
  {
    description: 'testWithPolicyTemplateBehaviorAll',
    download: 'testWithPolicyTemplateBehaviorAll',
    id: 'testWithPolicyTemplateBehaviorAll',
    name: 'testWithPolicyTemplateBehaviorAll',
    path: 'testWithPolicyTemplateBehaviorAll',
    release: 'ga',
    status: 'not_installed',
    title: 'testWithPolicyTemplateBehaviorAll',
    version: 'testWithPolicyTemplateBehaviorAll',
    policy_templates_behavior: 'all',
    policy_templates: [
      {
        description: 'testPolicyTemplate1BehaviorAll',
        name: 'testPolicyTemplate1BehaviorAll',
        icons: [
          {
            src: 'testPolicyTemplate1BehaviorAll',
            path: 'testPolicyTemplate1BehaviorAll',
          },
        ],
        title: 'testPolicyTemplate1BehaviorAll',
        type: 'testPolicyTemplate1BehaviorAll',
      },
      {
        description: 'testPolicyTemplate2BehaviorAll',
        name: 'testPolicyTemplate2BehaviorAll',
        icons: [
          {
            src: 'testPolicyTemplate2BehaviorAll',
            path: 'testPolicyTemplate2BehaviorAll',
          },
        ],
        title: 'testPolicyTemplate2BehaviorAll',
        type: 'testPolicyTemplate2BehaviorAll',
      },
    ],
  },
  {
    description: 'testWithPolicyTemplateBehaviorCombined',
    download: 'testWithPolicyTemplateBehaviorCombined',
    id: 'testWithPolicyTemplateBehaviorCombined',
    name: 'testWithPolicyTemplateBehaviorCombined',
    path: 'testWithPolicyTemplateBehaviorCombined',
    release: 'ga',
    status: 'not_installed',
    title: 'testWithPolicyTemplateBehaviorCombined',
    version: 'testWithPolicyTemplateBehaviorCombined',
    policy_templates_behavior: 'combined_policy',
    policy_templates: [
      {
        description: 'testPolicyTemplate1BehaviorCombined',
        name: 'testPolicyTemplate1BehaviorCombined',
        icons: [
          {
            src: 'testPolicyTemplate1BehaviorCombined',
            path: 'testPolicyTemplate1BehaviorCombined',
          },
        ],
        title: 'testPolicyTemplate1BehaviorCombined',
        type: 'testPolicyTemplate1BehaviorCombined',
      },
      {
        description: 'testPolicyTemplate2BehaviorCombined',
        name: 'testPolicyTemplate2BehaviorCombined',
        icons: [
          {
            src: 'testPolicyTemplate2BehaviorCombined',
            path: 'testPolicyTemplate2BehaviorCombined',
          },
        ],
        title: 'testPolicyTemplate2BehaviorCombined',
        type: 'testPolicyTemplate2BehaviorCombined',
      },
    ],
  },
  {
    description: 'testWithPolicyTemplateBehaviorIndividual',
    download: 'testWithPolicyTemplateBehaviorIndividual',
    id: 'testWithPolicyTemplateBehaviorIndividual',
    name: 'testWithPolicyTemplateBehaviorIndividual',
    path: 'testWithPolicyTemplateBehaviorIndividual',
    release: 'ga',
    status: 'not_installed',
    title: 'testWithPolicyTemplateBehaviorIndividual',
    version: 'testWithPolicyTemplateBehaviorIndividual',
    policy_templates_behavior: 'individual_policies',
    policy_templates: [
      {
        description: 'testPolicyTemplate1BehaviorIndividual',
        name: 'testPolicyTemplate1BehaviorIndividual',
        icons: [
          {
            src: 'testPolicyTemplate1BehaviorIndividual',
            path: 'testPolicyTemplate1BehaviorIndividual',
          },
        ],
        title: 'testPolicyTemplate1BehaviorIndividual',
        type: 'testPolicyTemplate1BehaviorIndividual',
      },
      {
        description: 'testPolicyTemplate2BehaviorIndividual',
        name: 'testPolicyTemplate2BehaviorIndividual',
        icons: [
          {
            src: 'testPolicyTemplate2BehaviorIndividual',
            path: 'testPolicyTemplate2BehaviorIndividual',
          },
        ],
        title: 'testPolicyTemplate2BehaviorIndividual',
        type: 'testPolicyTemplate2BehaviorIndividual',
      },
    ],
  },
];

const getTestScheduler = () => {
  return new TestScheduler((actual, expected) => {
    return expect(actual).toEqual(expected);
  });
};

describe('Package search provider', () => {
  let setupMock: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    setupMock = coreMock.createSetup();
    ExperimentalFeaturesService.init(allowedExperimentalValues);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#find', () => {
    test('returns formatted results', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        mockSendGetPackages.mockReturnValue(
          hot('--(a|)', { a: { data: { items: testResponse } } })
        );
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );

        const packageSearchProvider = createPackageSearchProvider(setupMock);

        expectObservable(
          packageSearchProvider.find(
            { term: 'test' },
            { aborted$: NEVER, maxResults: 100, preference: '' }
          )
        ).toBe('--(a|)', {
          a: [
            {
              id: 'test',
              score: 80,
              title: 'test',
              type: 'integration',
              url: {
                path: 'undefined/detail/test/overview',
                prependBasePath: false,
              },
            },
            {
              id: 'test1',
              score: 80,
              title: 'test1',
              type: 'integration',
              url: {
                path: 'undefined/detail/test1/overview',
                prependBasePath: false,
              },
            },
            {
              id: 'testWithPolicyTemplate',
              score: 80,
              title: 'testWithPolicyTemplate',
              type: 'integration',
              url: {
                path: 'undefined/detail/testWithPolicyTemplate/overview',
                prependBasePath: false,
              },
            },
            {
              id: 'testPolicyTemplate1',
              score: 80,
              title: 'testPolicyTemplate1',
              type: 'integration',
              url: {
                path: 'undefined/detail/testWithPolicyTemplate/overview?integration=testPolicyTemplate1',
                prependBasePath: false,
              },
            },
            {
              id: 'testPolicyTemplate2',
              score: 80,
              title: 'testPolicyTemplate2',
              type: 'integration',
              url: {
                path: 'undefined/detail/testWithPolicyTemplate/overview?integration=testPolicyTemplate2',
                prependBasePath: false,
              },
            },
            {
              id: 'testWithASinglePolicyTemplate',
              score: 80,
              title: 'testWithASinglePolicyTemplate',
              type: 'integration',
              url: {
                path: 'undefined/detail/testWithASinglePolicyTemplate/overview',
                prependBasePath: false,
              },
            },
          ],
        });
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    test('calls EPR once only', () => {
      getTestScheduler().run(({ hot }) => {
        mockSendGetPackages.mockReturnValue(hot('--(a|)', { a: { data: { items: [] } } }));
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );
        const packageSearchProvider = createPackageSearchProvider(setupMock);
        packageSearchProvider.find(
          { term: 'test' },
          { aborted$: NEVER, maxResults: 100, preference: '' }
        );
        packageSearchProvider.find(
          { term: 'test' },
          { aborted$: NEVER, maxResults: 100, preference: '' }
        );
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    test('completes without returning results if aborted', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        mockSendGetPackages.mockReturnValue(hot('--(a|)', { a: { data: { items: [] } } }));
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );
        const aborted$ = hot('-a', { a: undefined });
        const packageSearchProvider = createPackageSearchProvider(setupMock);

        expectObservable(
          packageSearchProvider.find(
            { term: 'test' },
            { aborted$, maxResults: 100, preference: '' }
          )
        ).toBe('-|');
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    test('respect maximum results', () => {
      getTestScheduler().run(({ hot, expectObservable }) => {
        mockSendGetPackages.mockReturnValue(
          hot('--(a|)', { a: { data: { items: testResponse } } })
        );
        setupMock.getStartServices.mockReturnValue(
          hot('--(a|)', { a: [coreMock.createStart()] }) as any
        );
        const packageSearchProvider = createPackageSearchProvider(setupMock);
        expectObservable(
          packageSearchProvider.find(
            { term: 'test1' },
            { aborted$: NEVER, maxResults: 1, preference: '' }
          )
        ).toBe('--(a|)', {
          a: [
            {
              id: 'test1',
              score: 80,
              title: 'test1',
              type: 'integration',
              url: {
                path: 'undefined/detail/test1/overview',
                prependBasePath: false,
              },
            },
          ],
        });
      });

      expect(sendGetPackages).toHaveBeenCalledTimes(1);
    });

    describe('tags', () => {
      test('without packages tag, without search term', () => {
        getTestScheduler().run(({ hot, expectObservable }) => {
          mockSendGetPackages.mockReturnValue(
            hot('--(a|)', { a: { data: { items: testResponse } } })
          );
          setupMock.getStartServices.mockReturnValue(
            hot('--(a|)', { a: [coreMock.createStart()] }) as any
          );
          const packageSearchProvider = createPackageSearchProvider(setupMock);
          expectObservable(
            packageSearchProvider.find(
              { types: ['test'] },
              { aborted$: NEVER, maxResults: 100, preference: '' }
            )
          ).toBe('(a|)', {
            a: [],
          });
        });

        expect(sendGetPackages).toHaveBeenCalledTimes(0);
      });

      test('with integration tag, with no search term', () => {
        getTestScheduler().run(({ hot, expectObservable }) => {
          mockSendGetPackages.mockReturnValue(
            hot('--(a|)', { a: { data: { items: testResponse } } })
          );
          setupMock.getStartServices.mockReturnValue(
            hot('--(a|)', { a: [coreMock.createStart()] }) as any
          );
          const packageSearchProvider = createPackageSearchProvider(setupMock);
          expectObservable(
            packageSearchProvider.find(
              { types: ['integration'] },
              { aborted$: NEVER, maxResults: 100, preference: '' }
            )
          ).toBe('--(a|)', {
            a: [
              {
                id: 'test',
                score: 80,
                title: 'test',
                type: 'integration',
                url: {
                  path: 'undefined/detail/test/overview',
                  prependBasePath: false,
                },
              },
              {
                id: 'test1',
                score: 80,
                title: 'test1',
                type: 'integration',
                url: {
                  path: 'undefined/detail/test1/overview',
                  prependBasePath: false,
                },
              },
              {
                id: 'testWithPolicyTemplate',
                score: 80,
                title: 'testWithPolicyTemplate',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplate/overview',
                  prependBasePath: false,
                },
              },
              {
                id: 'testPolicyTemplate1',
                score: 80,
                title: 'testPolicyTemplate1',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplate/overview?integration=testPolicyTemplate1',
                  prependBasePath: false,
                },
              },
              {
                id: 'testPolicyTemplate2',
                score: 80,
                title: 'testPolicyTemplate2',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplate/overview?integration=testPolicyTemplate2',
                  prependBasePath: false,
                },
              },
              {
                id: 'testWithASinglePolicyTemplate',
                score: 80,
                title: 'testWithASinglePolicyTemplate',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithASinglePolicyTemplate/overview',
                  prependBasePath: false,
                },
              },
            ],
          });
        });

        expect(sendGetPackages).toHaveBeenCalledTimes(1);
      });

      test('with integration tag, with policy_templates_behavior field', () => {
        getTestScheduler().run(({ hot, expectObservable }) => {
          mockSendGetPackages.mockReturnValue(
            hot('--(a|)', { a: { data: { items: testResponseBehaviorField } } })
          );
          setupMock.getStartServices.mockReturnValue(
            hot('--(a|)', { a: [coreMock.createStart()] }) as any
          );
          const packageSearchProvider = createPackageSearchProvider(setupMock);
          expectObservable(
            packageSearchProvider.find(
              { types: ['integration'] },
              { aborted$: NEVER, maxResults: 100, preference: '' }
            )
          ).toBe('--(a|)', {
            a: [
              {
                id: 'testWithPolicyTemplateBehaviorAll',
                score: 80,
                title: 'testWithPolicyTemplateBehaviorAll',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplateBehaviorAll/overview',
                  prependBasePath: false,
                },
              },
              {
                id: 'testPolicyTemplate1BehaviorAll',
                score: 80,
                title: 'testPolicyTemplate1BehaviorAll',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplateBehaviorAll/overview?integration=testPolicyTemplate1BehaviorAll',
                  prependBasePath: false,
                },
              },
              {
                id: 'testPolicyTemplate2BehaviorAll',
                score: 80,
                title: 'testPolicyTemplate2BehaviorAll',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplateBehaviorAll/overview?integration=testPolicyTemplate2BehaviorAll',
                  prependBasePath: false,
                },
              },
              {
                id: 'testWithPolicyTemplateBehaviorCombined',
                score: 80,
                title: 'testWithPolicyTemplateBehaviorCombined',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplateBehaviorCombined/overview',
                  prependBasePath: false,
                },
              },
              {
                id: 'testPolicyTemplate1BehaviorIndividual',
                score: 80,
                title: 'testPolicyTemplate1BehaviorIndividual',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplateBehaviorIndividual/overview?integration=testPolicyTemplate1BehaviorIndividual',
                  prependBasePath: false,
                },
              },
              {
                id: 'testPolicyTemplate2BehaviorIndividual',
                score: 80,
                title: 'testPolicyTemplate2BehaviorIndividual',
                type: 'integration',
                url: {
                  path: 'undefined/detail/testWithPolicyTemplateBehaviorIndividual/overview?integration=testPolicyTemplate2BehaviorIndividual',
                  prependBasePath: false,
                },
              },
            ],
          });
        });

        expect(sendGetPackages).toHaveBeenCalledTimes(1);
      });

      test('with integration tag, with search term', () => {
        getTestScheduler().run(({ hot, expectObservable }) => {
          mockSendGetPackages.mockReturnValue(
            hot('--(a|)', { a: { data: { items: testResponse } } })
          );
          setupMock.getStartServices.mockReturnValue(
            hot('--(a|)', { a: [coreMock.createStart()] }) as any
          );
          const packageSearchProvider = createPackageSearchProvider(setupMock);
          expectObservable(
            packageSearchProvider.find(
              { term: 'test1', types: ['integration'] },
              { aborted$: NEVER, maxResults: 100, preference: '' }
            )
          ).toBe('--(a|)', {
            a: [
              {
                id: 'test1',
                score: 80,
                title: 'test1',
                type: 'integration',
                url: {
                  path: 'undefined/detail/test1/overview',
                  prependBasePath: false,
                },
              },
            ],
          });
        });

        expect(sendGetPackages).toHaveBeenCalledTimes(1);
      });

      describe('collections', () => {
        const makePackage = (name: string, title: string, extra: Record<string, unknown> = {}) =>
          ({
            description: title,
            download: name,
            id: name,
            name,
            path: name,
            release: 'ga',
            status: 'not_installed',
            title,
            version: '1.0.0',
            ...extra,
          } as GetPackagesResponse['items'][number]);

        const packages = [
          makePackage('aws', 'AWS', {
            policy_templates: [
              { name: 'cloudtrail', title: 'AWS CloudTrail' },
              { name: 's3', title: 'Amazon S3' },
              { name: 'ec2', title: 'Amazon EC2' },
            ],
          }),
          makePackage('aws_logs', 'AWS Custom Logs'),
          makePackage('aws_ec2_otel', 'AWS EC2 OpenTelemetry'),
          makePackage('nginx', 'Nginx', {
            group: 'nginx',
            policy_templates: [
              { name: 'metrics', title: 'Stub status metrics' },
              { name: 'logs', title: 'Access and error logs' },
            ],
          }),
          makePackage('nginx_ingress_controller', 'Nginx Ingress Controller', {
            group: 'nginx',
            policy_templates_behavior: 'individual_policies',
            policy_templates: [
              { name: 'access', title: 'Nginx access logs' },
              { name: 'error', title: 'Nginx error logs' },
            ],
          }),
          ...['One', 'Two', 'Three', 'Four', 'Five'].map((n) =>
            makePackage(`kafka_${n.toLowerCase()}`, `Stream ${n}`, { group: 'kafka' })
          ),
          // A group with a single package is not a collection
          makePackage('redis', 'Redis', { group: 'redis' }),
          makePackage('sample', 'Sample'),
        ];

        // aws templates (3) + aws_logs, the otel variant is not counted
        const awsResult = (meta: Record<string, string> = {}) => ({
          id: 'aws-onboarding',
          type: 'integration',
          title: 'Amazon Web Services',
          score: 80,
          icon: 'logoAWS',
          url: { path: '/app/onboarding/aws', prependBasePath: false },
          meta: { trailingLabel: 'Collection of 4', ...meta },
        });

        const nginxResult = (meta: Record<string, string> = {}) =>
          expect.objectContaining({
            id: 'collection:nginx',
            type: 'integration',
            title: 'Nginx',
            url: { path: '/app/integrations/browse?collection=nginx', prependBasePath: false },
            meta: { trailingLabel: 'Collection of 2', ...meta },
          });

        const find = async ({
          onboardingEnabled = true,
          collectionTilesEnabled = true,
          search,
          maxResults = 100,
        }: {
          onboardingEnabled?: boolean;
          collectionTilesEnabled?: boolean;
          search: { term?: string; types?: string[] };
          maxResults?: number;
        }) => {
          ExperimentalFeaturesService.init({
            ...allowedExperimentalValues,
            enableIntegrationCollectionTiles: collectionTilesEnabled,
          });
          const start = coreMock.createStart();
          (start.featureFlags.getBooleanValue$ as jest.Mock).mockReturnValue(of(onboardingEnabled));
          (start.application.getUrlForApp as jest.Mock).mockImplementation(
            (app: string, options?: { path?: string }) => `/app/${app}${options?.path ?? ''}`
          );
          mockSendGetPackages.mockReturnValue(Promise.resolve({ data: { items: packages } }));
          setupMock.getStartServices.mockResolvedValue([start, {}, {}] as any);

          return firstValueFrom(
            createPackageSearchProvider(setupMock).find(search, {
              aborted$: NEVER,
              maxResults,
              preference: '',
            })
          );
        };

        const ids = (results: Array<{ id: string }>) => results.map((r) => r.id);

        describe('AWS onboarding', () => {
          test('flag off: keeps one result per AWS package and template', async () => {
            const results = await find({ onboardingEnabled: false, search: { term: 'aws' } });

            expect(ids(results)).toEqual(['aws', 'cloudtrail', 'aws_logs', 'aws_ec2_otel']);
          });

          test('flag on: a search for the collection returns it with its size and no subtitle', async () => {
            expect(await find({ search: { term: 'aws' } })).toEqual([awsResult()]);
          });

          test('flag on: a search for a member service explains the match', async () => {
            expect(await find({ search: { term: 'cloudtrail' } })).toEqual([
              awsResult({
                description: 'AWS CloudTrail is part of the Amazon Web Services collection',
              }),
            ]);
          });

          test('flag on: a search for a word of the collection title shows no subtitle', async () => {
            expect(await find({ search: { term: 'amazon' } })).toEqual([awsResult()]);
          });
        });

        describe('manifest group collections', () => {
          test('a search for the group returns one collection and no member rows', async () => {
            expect(await find({ search: { term: 'nginx' } })).toEqual([nginxResult()]);
          });

          test('a search for a member package explains the match', async () => {
            expect(await find({ search: { term: 'ingress' } })).toEqual([
              nginxResult({
                description: 'Nginx Ingress Controller is part of the Nginx collection',
              }),
            ]);
          });

          test('a search for a policy template of a member package finds the collection', async () => {
            expect(await find({ search: { term: 'stub status' } })).toEqual([nginxResult()]);
          });

          test('a search for the title of an individual_policies package finds the collection', async () => {
            expect(await find({ search: { term: 'ingress controller' } })).toEqual([
              nginxResult({
                description: 'Nginx Ingress Controller is part of the Nginx collection',
              }),
            ]);
          });

          test('a search matching many members names the first three and counts the rest', async () => {
            const [result] = await find({ search: { term: 'stream' } });

            expect(result).toEqual(
              expect.objectContaining({
                id: 'collection:kafka',
                meta: {
                  trailingLabel: 'Collection of 5',
                  description:
                    'Stream One, Stream Two, Stream Three, and 2 more are part of the Kafka collection',
                },
              })
            );
          });

          test('a group with a single package stays a regular result', async () => {
            const results = await find({ search: { term: 'redis' } });

            expect(ids(results)).toEqual(['redis']);
          });

          test('collection tiles disabled: keeps one result per package', async () => {
            const results = await find({
              collectionTilesEnabled: false,
              search: { term: 'nginx' },
            });

            // `nginx_ingress_controller` is `individual_policies`: it is listed by its templates
            expect(ids(results)).toEqual(['nginx', 'access', 'error']);
          });
        });

        test('an unrelated search returns no collection', async () => {
          const results = await find({ search: { term: 'sample' } });

          expect(ids(results)).toEqual(['sample']);
        });

        test('listing all integrations returns each collection once, first', async () => {
          const results = await find({ search: { types: ['integration'] } });

          expect(ids(results)).toEqual([
            'aws-onboarding',
            'collection:nginx',
            'collection:kafka',
            'redis',
            'sample',
          ]);
        });

        test('collections do not use up maxResults', async () => {
          const results = await find({ search: { types: ['integration'] }, maxResults: 3 });

          expect(ids(results)).toEqual(['aws-onboarding', 'collection:nginx', 'collection:kafka']);
        });
      });
    });
  });

  describe('toSearchResult', () => {
    let startMock: ReturnType<typeof coreMock.createStart>;

    beforeEach(() => {
      startMock = coreMock.createStart();
    });

    it('uses svg icon if available', () => {
      const pkg = {
        ...testResponse[0],
        icons: [{ type: 'image/svg+xml', src: '/img_nginx.svg', path: '' }],
      };
      const { icon } = toSearchResult(pkg, startMock.application, startMock.http.basePath)[0];
      expect(icon).toMatchInlineSnapshot(`"/api/fleet/epm/packages/test/test/img_nginx.svg"`);
    });

    it('prepends base path to svg URL', () => {
      startMock = coreMock.createStart({ basePath: '/foo' });
      const pkg = {
        ...testResponse[0],
        icons: [{ type: 'image/svg+xml', src: '/img_nginx.svg', path: '' }],
      };
      const { icon } = toSearchResult(pkg, startMock.application, startMock.http.basePath)[0];
      expect(icon).toMatchInlineSnapshot(`"/foo/api/fleet/epm/packages/test/test/img_nginx.svg"`);
    });

    // ICON_TYPES is empty in EUI: https://github.com/elastic/eui/issues/5138
    it.skip('uses eui icon type as fallback', () => {
      const pkg = {
        ...testResponse[0],
        name: 'elasticsearch',
        icons: [{ type: 'image/jpg', src: '/img_nginx.svg', path: '' }],
      };
      const { icon } = toSearchResult(pkg, startMock.application, startMock.http.basePath)[0];
      expect(icon).toMatchInlineSnapshot(`"logoElasticsearch"`);
    });
  });
});

describe('Custom Integrations search provider', () => {
  let customIntegrationsMock: CustomIntegrationsSetup;
  const customIntegrationsMockData = [
    {
      id: 'custom1',
      title: 'Custom Integration 1',
      uiInternalPath: '/app/custom1',
      icons: [{ src: 'icon1.svg' }],
    },
    {
      id: 'custom2',
      title: 'Custom Integration 2',
      uiInternalPath: '/app/custom2',
      icons: [{ src: 'icon2.svg' }],
    },
  ];

  beforeEach(() => {
    customIntegrationsMock = {
      getReplacementCustomIntegrations: jest.fn(),
    } as unknown as CustomIntegrationsSetup;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#find', () => {
    test('returns formatted results', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        (customIntegrationsMock.getReplacementCustomIntegrations as jest.Mock).mockReturnValue(
          hot('--a|', { a: customIntegrationsMockData })
        );

        const customIntegrationsSearchProvider =
          createCustomIntegrationsSearchProvider(customIntegrationsMock);

        expectObservable(
          customIntegrationsSearchProvider.find(
            { term: 'custom' },
            { aborted$: NEVER, maxResults: 100, preference: '' }
          )
        ).toBe('--a|', {
          a: [
            {
              id: 'custom1',
              score: 80,
              title: 'Custom Integration 1',
              type: 'integration',
              url: '/app/custom1',
              icon: 'icon1.svg',
            },
            {
              id: 'custom2',
              score: 80,
              title: 'Custom Integration 2',
              type: 'integration',
              url: '/app/custom2',
              icon: 'icon2.svg',
            },
          ],
        });
      });

      expect(customIntegrationsMock.getReplacementCustomIntegrations).toHaveBeenCalledTimes(1);
    });

    test('returns empty array if no term is provided', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        (customIntegrationsMock.getReplacementCustomIntegrations as jest.Mock).mockReturnValue(
          hot('--a|', { a: [] })
        );

        const customIntegrationsSearchProvider =
          createCustomIntegrationsSearchProvider(customIntegrationsMock);

        expectObservable(
          customIntegrationsSearchProvider.find(
            { term: '' },
            { aborted$: NEVER, maxResults: 100, preference: '' }
          )
        ).toBe('(a|)', {
          a: [],
        });
      });

      expect(customIntegrationsMock.getReplacementCustomIntegrations).toHaveBeenCalledTimes(0);
    });

    test('completes without returning results if aborted', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        (customIntegrationsMock.getReplacementCustomIntegrations as jest.Mock).mockReturnValue(
          hot('--a|', { a: customIntegrationsMockData })
        );
        const aborted$ = hot('-a', { a: undefined });
        const customIntegrationsSearchProvider =
          createCustomIntegrationsSearchProvider(customIntegrationsMock);

        expectObservable(
          customIntegrationsSearchProvider.find(
            { term: 'custom' },
            { aborted$, maxResults: 100, preference: '' }
          )
        ).toBe('-|');
      });

      expect(customIntegrationsMock.getReplacementCustomIntegrations).toHaveBeenCalledTimes(1);
    });

    test('respects maximum results', () => {
      getTestScheduler().run(({ hot, expectObservable }) => {
        (customIntegrationsMock.getReplacementCustomIntegrations as jest.Mock).mockReturnValue(
          hot('--a|', { a: customIntegrationsMockData })
        );

        const customIntegrationsSearchProvider =
          createCustomIntegrationsSearchProvider(customIntegrationsMock);

        expectObservable(
          customIntegrationsSearchProvider.find(
            { term: 'custom' },
            { aborted$: NEVER, maxResults: 1, preference: '' }
          )
        ).toBe('--a|', {
          a: [
            {
              id: 'custom1',
              score: 80,
              title: 'Custom Integration 1',
              type: 'integration',
              url: '/app/custom1',
              icon: 'icon1.svg',
            },
          ],
        });
      });

      expect(customIntegrationsMock.getReplacementCustomIntegrations).toHaveBeenCalledTimes(1);
    });
  });
});

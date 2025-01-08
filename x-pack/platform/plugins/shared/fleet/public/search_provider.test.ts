/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestScheduler } from 'rxjs/testing';
import { NEVER } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';

import { createPackageSearchProvider, toSearchResult } from './search_provider';
import type { GetPackagesResponse } from './types';

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('#find', () => {
    test('returns formatted results', () => {
      getTestScheduler().run(({ expectObservable, hot }) => {
        mockSendGetPackages.mockReturnValue(
          hot('--(a|)', { a: { data: { response: testResponse } } })
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
        mockSendGetPackages.mockReturnValue(hot('--(a|)', { a: { data: { response: [] } } }));
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
        mockSendGetPackages.mockReturnValue(hot('--(a|)', { a: { data: { response: [] } } }));
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
          hot('--(a|)', { a: { data: { response: testResponse } } })
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
            hot('--(a|)', { a: { data: { response: testResponse } } })
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
            hot('--(a|)', { a: { data: { response: testResponse } } })
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
            hot('--(a|)', { a: { data: { response: testResponseBehaviorField } } })
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
            hot('--(a|)', { a: { data: { response: testResponse } } })
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

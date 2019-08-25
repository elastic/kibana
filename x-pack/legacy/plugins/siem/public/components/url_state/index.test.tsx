/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Location } from 'history';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { Router } from 'react-router-dom';
import { MockedProvider } from 'react-apollo/test-utils';
import { StaticIndexPattern } from 'ui/index_patterns';

import {
  apolloClientObservable,
  globalNode,
  HookWrapper,
  mockGlobalState,
  TestProviders,
} from '../../mock';
import { createStore, State } from '../../store';

import { UseUrlState } from './';
import { defaultProps, getMockPropsObj, mockHistory, testCases } from './test_dependencies';
import { UrlStateContainerPropTypes } from './types';
import { useUrlStateHooks, initializeLocation } from './use_url_state';
import { CONSTANTS } from './constants';

let mockProps: UrlStateContainerPropTypes;

const indexPattern: StaticIndexPattern = {
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      aggregatable: true,
      searchable: true,
    },
  ],
};
describe('UrlStateContainer', () => {
  const state: State = mockGlobalState;

  let store = createStore(state, apolloClientObservable);

  beforeEach(() => {
    store = createStore(state, apolloClientObservable);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('mounts and renders', () => {
    const wrapper = mount(
      <MockedProvider>
        <TestProviders store={store}>
          <Router history={mockHistory}>
            <UseUrlState isInitializing={true} indexPattern={indexPattern} />
          </Router>
        </TestProviders>
      </MockedProvider>
    );
    const urlStateComponents = wrapper.find('[data-test-subj="urlStateComponents"]');
    urlStateComponents.exists();
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('handleInitialize', () => {
    describe('URL state updates redux', () => {
      describe('relative timerange actions are called with correct data on component mount', () => {
        test.each(testCases)('%o', (page, namespaceLower, namespaceUpper, examplePath) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower }).relativeTimeSearch
            .undefinedQuery;
          mount(<HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />);

          // @ts-ignore property mock does not exists
          expect(defaultProps.setRelativeTimerange.mock.calls[0][0]).toEqual({
            from: 1558591200000,
            fromStr: 'now-1d/d',
            kind: 'relative',
            to: 1558677599999,
            toStr: 'now-1d/d',
            id: 'global',
          });
          // @ts-ignore property mock does not exists
          expect(defaultProps.setRelativeTimerange.mock.calls[1][0]).toEqual({
            from: 1558732849370,
            fromStr: 'now-15m',
            kind: 'relative',
            to: 1558733749370,
            toStr: 'now',
            id: 'timeline',
          });
        });
      });

      describe('absolute timerange actions are called with correct data on component mount', () => {
        test.each(testCases)('%o', (page, namespaceLower, namespaceUpper, examplePath) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower }).absoluteTimeSearch
            .undefinedQuery;
          mount(<HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />);

          // @ts-ignore property mock does not exists
          expect(defaultProps.setAbsoluteTimerange.mock.calls[0][0]).toEqual({
            from: 1556736012685,
            kind: 'absolute',
            to: 1556822416082,
            id: 'global',
          });
          // @ts-ignore property mock does not exists
          expect(defaultProps.setAbsoluteTimerange.mock.calls[1][0]).toEqual({
            from: 1556736012685,
            kind: 'absolute',
            to: 1556822416082,
            id: 'timeline',
          });
        });
      });

      describe('kqlQuery action is called with correct data on component mount', () => {
        const serializedFilterQuery = {
          kuery: {
            expression: 'host.name:"siem-es"',
            kind: 'kuery',
          },
          serializedQuery:
            '{"bool":{"should":[{"match_phrase":{"host.name":"siem-es"}}],"minimum_should_match":1}}',
        };
        test.each(testCases.slice(0, 4))(
          ' %o',
          (page, namespaceLower, namespaceUpper, examplePath, type) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower }).relativeTimeSearch
              .undefinedQuery;
            mount(<HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />);
            const functionName =
              namespaceUpper === 'Network' ? defaultProps.setNetworkKql : defaultProps.setHostsKql;
            // @ts-ignore property mock does not exists
            expect(functionName.mock.calls[0][0]).toEqual({
              filterQuery: serializedFilterQuery,
              [`${namespaceLower}Type`]: type,
            });
          }
        );
      });

      describe('kqlQuery action is not called called when the queryLocation does not match the router location', () => {
        test.each(testCases)('%o', async (page, namespaceLower, namespaceUpper, examplePath) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower })
            .oppositeQueryLocationSearch.undefinedQuery;
          mount(<HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />);
          const functionName =
            namespaceUpper === 'Network' ? defaultProps.setNetworkKql : defaultProps.setHostsKql;
          // @ts-ignore property mock does not exists
          expect(functionName.mock.calls.length).toEqual(0);
        });
      });
    });

    describe('Redux updates URL state', () => {
      describe('kqlQuery url state is set from redux data on component mount', () => {
        test.each(testCases)('%o', async (page, namespaceLower, namespaceUpper, examplePath) => {
          mockProps = getMockPropsObj({ page, examplePath, namespaceLower }).noSearch.definedQuery;
          mount(<HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />);

          // @ts-ignore property mock does not exists
          expect(
            mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
          ).toEqual({
            hash: '',
            pathname: examplePath,
            search: [CONSTANTS.overviewPage, CONSTANTS.timelinePage].includes(page)
              ? '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))'
              : `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${page})&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`,
            state: '',
          });
        });
      });
    });
  });

  describe('initializeLocation', () => {
    test('basic functionality with no pathname', () => {
      Object.defineProperty(globalNode.window, 'location', {
        value: {
          href: 'http://localhost:5601/app/siem#/overview',
          hash: '#/overview',
        },
        writable: true,
      });
      const location: Location = {
        hash: '',
        pathname: '/',
        search: '',
        state: null,
      };
      expect(initializeLocation(location).search).toEqual('');
    });
    test('basic functionality with no search', () => {
      Object.defineProperty(globalNode.window, 'location', {
        value: {
          href: 'http://localhost:5601/app/siem#/hosts?_g=()',
        },
        writable: true,
      });
      const location: Location = {
        hash: '',
        pathname: '/hosts',
        search: '?_g=()',
        state: null,
      };
      expect(initializeLocation(location).search).toEqual('?_g=()');
    });

    test('basic functionality with search', () => {
      Object.defineProperty(globalNode.window, 'location', {
        value: {
          href:
            "http://localhost:5601/app/siem#/hosts?_g=()&kqlQuery=(filterQuery:(expression:'%20host.name:%20%22beats-ci-immutable-ubuntu-1604-1560801145745062645%22%20and%20process.name:*',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)))",
        },
        writable: true,
      });
      const location: Location = {
        hash: '',
        pathname: '/hosts',
        search:
          "?_g=()&kqlQuery=(filterQuery:(expression:'%2Bhost.name:%2B%22beats-ci-immutable-ubuntu-1604-1560801145745062645%22%2Band%2Bprocess.name:*',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)))",
        state: null,
      };
      expect(initializeLocation(location).search).toEqual(
        "?_g=()&kqlQuery=(filterQuery:(expression:'%20host.name:%20%22beats-ci-immutable-ubuntu-1604-1560801145745062645%22%20and%20process.name:*',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)))"
      );
    });

    test('If hash and pathname do not match href from the hash, do not do anything', () => {
      Object.defineProperty(globalNode.window, 'location', {
        value: {
          href:
            "http://localhost:5601/app/siem#/hosts?_g=()&kqlQuery=(filterQuery:(expression:'%20host.name:%20%22beats-ci-immutable-ubuntu-1604-1560801145745062645%22%20and%20process.name:*',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)))",
        },
        writable: true,
      });
      const location: Location = {
        hash: '',
        pathname: '/network',
        search:
          "?_g=()&kqlQuery=(filterQuery:(expression:'%2Bhost.name:%2B%22beats-ci-immutable-ubuntu-1604-1560801145745062645%22%2Band%2Bprocess.name:*',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)))",
        state: null,
      };
      expect(initializeLocation(location).search).toEqual(
        "?_g=()&kqlQuery=(filterQuery:(expression:'%2Bhost.name:%2B%22beats-ci-immutable-ubuntu-1604-1560801145745062645%22%2Band%2Bprocess.name:*',kind:kuery),queryLocation:hosts.page,type:page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1560714985274,fromStr:now-24h,kind:relative,to:1560801385274,toStr:now)))"
      );
    });
  });
});

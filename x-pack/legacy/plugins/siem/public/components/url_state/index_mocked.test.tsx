/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { difference } from 'lodash/fp';
import * as React from 'react';

import { HookWrapper } from '../../mock/hook_wrapper';
import { SiemPageName } from '../../pages/home/home_navigations';

import { CONSTANTS } from './constants';
import { getFilterQuery, getMockPropsObj, mockHistory, testCases } from './test_dependencies';
import { UrlStateContainerPropTypes } from './types';
import { useUrlStateHooks } from './use_url_state';

jest.mock('lodash/fp');

let mockProps: UrlStateContainerPropTypes;

describe('UrlStateContainer - lodash.throttle mocked to test update url', () => {
  beforeEach(() => {
    // @ts-ignore property mockImplementation does not exists
    difference.mockImplementation((all, items) =>
      all.filter((item: string) => !items.includes(item))
    );
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('componentDidUpdate', () => {
    test('timerange redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SiemPageName.network,
        detailName: undefined,
      }).noSearch.definedQuery;
      const wrapper = mount(
        <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
      );

      const newUrlState = {
        ...mockProps.urlState,
        [CONSTANTS.timerange]: {
          global: {
            [CONSTANTS.timerange]: {
              from: 0,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1,
              toStr: 'now',
            },
            linkTo: ['timeline'],
          },
          timeline: {
            [CONSTANTS.timerange]: {
              from: 0,
              fromStr: 'now-24h',
              kind: 'relative',
              to: 1,
              toStr: 'now',
            },
            linkTo: ['global'],
          },
        },
      };

      wrapper.setProps({ hookProps: { ...mockProps, urlState: newUrlState } });
      wrapper.update();
      expect(
        mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
      ).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:network.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now)),timeline:(linkTo:!(global),timerange:(from:0,fromStr:now-24h,kind:relative,to:1,toStr:now)))",
        state: '',
      });
    });

    test('kql query redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SiemPageName.network,
        detailName: undefined,
      }).noSearch.undefinedQuery;
      const wrapper = mount(
        <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
      );
      const newUrlState = {
        ...mockProps.urlState,
        [CONSTANTS.kqlQuery]: {
          ...getFilterQuery(CONSTANTS.networkPage),
          queryLocation: CONSTANTS.networkPage,
        },
      };
      wrapper.setProps({
        hookProps: { ...mockProps, urlState: newUrlState, isInitializing: false },
      });
      wrapper.update();

      expect(
        mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
      ).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          "?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:network.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))",
        state: '',
      });
    });

    test('timelineID redux state updates the url', () => {
      mockProps = getMockPropsObj({
        page: CONSTANTS.networkPage,
        examplePath: '/network',
        namespaceLower: 'network',
        pageName: SiemPageName.network,
        detailName: undefined,
      }).noSearch.undefinedQuery;
      const wrapper = mount(
        <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
      );
      const newUrlState = {
        ...mockProps.urlState,
        timelineId: 'hello_timeline_id',
      };
      wrapper.setProps({
        hookProps: { ...mockProps, urlState: newUrlState, isInitializing: false },
      });
      wrapper.update();

      expect(
        mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
      ).toStrictEqual({
        hash: '',
        pathname: '/network',
        search:
          '?_g=()&timelineId=hello_timeline_id&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        state: '',
      });
    });
  });

  describe('handleInitialize', () => {
    describe('Redux updates URL state', () => {
      describe('Timerange url state is set when not defined on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, pageName, detailName })
              .noSearch.undefinedQuery;
            mount(<HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />);

            expect(mockHistory.replace.mock.calls[0][0]).toEqual({
              hash: '',
              pathname: examplePath,
              search: '?_g=()',
              state: '',
            });

            expect(
              mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
            ).toEqual({
              hash: '',
              pathname: examplePath,
              search:
                '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
              state: '',
            });
          }
        );

        test('url state is set from redux data when location updates and initialization', () => {
          mockProps = getMockPropsObj({
            page: CONSTANTS.hostsPage,
            examplePath: '/hosts',
            namespaceLower: 'hosts',
            pageName: SiemPageName.hosts,
            detailName: undefined,
          }).noSearch.undefinedQuery;
          const updatedProps = getMockPropsObj({
            page: CONSTANTS.networkPage,
            examplePath: '/network',
            namespaceLower: 'network',
            pageName: SiemPageName.network,
            detailName: undefined,
          }).noSearch.definedQuery;
          const wrapper = mount(
            <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
          );

          expect(
            mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0].search
          ).toEqual(
            '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))'
          );

          wrapper.setProps({ hookProps: updatedProps });
          wrapper.update();

          expect(
            mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0].search
          ).toEqual(
            "?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:network.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))"
          );
        });
      });
    });
  });
});

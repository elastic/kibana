/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import { MockedProvider } from '@apollo/client/testing';

import { HookWrapper } from '../../mock';
import { SiemPageName } from '../../pages/home/types';
import { RouteSpyState } from '../../utils/route/types';

import { CONSTANTS } from './constants';
import {
  getMockPropsObj,
  mockHistory,
  mockSetFilterQuery,
  mockSetAbsoluteRangeDatePicker,
  mockSetRelativeRangeDatePicker,
  testCases,
} from './test_dependencies';
import { UrlStateContainerPropTypes } from './types';
import { useUrlStateHooks } from './use_url_state';

let mockProps: UrlStateContainerPropTypes;

// const mockUseRouteSpy: jest.Mock = useRouteSpy as jest.Mock;
const mockRouteSpy: RouteSpyState = {
  pageName: SiemPageName.network,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/network',
};
jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => [mockRouteSpy],
}));

jest.mock('../search_bar', () => ({
  siemFilterManager: {
    setFilters: jest.fn(),
  },
}));

describe('UrlStateContainer', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
  describe('handleInitialize', () => {
    describe('URL state updates redux', () => {
      describe('relative timerange actions are called with correct data on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({
              page,
              examplePath,
              namespaceLower,
              pageName,
              detailName,
            }).relativeTimeSearch.undefinedQuery;
            mount(
              <MockedProvider>
                <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
              </MockedProvider>
            );

            expect(mockSetRelativeRangeDatePicker.mock.calls[1][0]).toEqual({
              from: 1558591200000,
              fromStr: 'now-1d/d',
              kind: 'relative',
              to: 1558677599999,
              toStr: 'now-1d/d',
              id: 'global',
            });

            expect(mockSetRelativeRangeDatePicker.mock.calls[0][0]).toEqual({
              from: 1558732849370,
              fromStr: 'now-15m',
              kind: 'relative',
              to: 1558733749370,
              toStr: 'now',
              id: 'timeline',
            });
          }
        );
      });

      describe('absolute timerange actions are called with correct data on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, pageName, detailName })
              .absoluteTimeSearch.undefinedQuery;
            mount(
              <MockedProvider>
                <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
              </MockedProvider>
            );

            expect(mockSetAbsoluteRangeDatePicker.mock.calls[1][0]).toEqual({
              from: 1556736012685,
              kind: 'absolute',
              to: 1556822416082,
              id: 'global',
            });

            expect(mockSetAbsoluteRangeDatePicker.mock.calls[0][0]).toEqual({
              from: 1556736012685,
              kind: 'absolute',
              to: 1556822416082,
              id: 'timeline',
            });
          }
        );
      });

      describe('appQuery action is called with correct data on component mount', () => {
        test.each(testCases.slice(0, 4))(
          ' %o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({ page, examplePath, namespaceLower, pageName, detailName })
              .relativeTimeSearch.undefinedQuery;
            mount(
              <MockedProvider>
                <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
              </MockedProvider>
            );

            expect(mockSetFilterQuery.mock.calls[0][0]).toEqual({
              id: 'global',
              language: 'kuery',
              query: 'host.name:"siem-es"',
            });
          }
        );
      });
    });

    describe('Redux updates URL state', () => {
      describe('appQuery url state is set from redux data on component mount', () => {
        test.each(testCases)(
          '%o',
          (page, namespaceLower, namespaceUpper, examplePath, type, pageName, detailName) => {
            mockProps = getMockPropsObj({
              page,
              examplePath,
              namespaceLower,
              pageName,
              detailName,
            }).noSearch.definedQuery;
            mount(
              <MockedProvider>
                <HookWrapper hookProps={mockProps} hook={args => useUrlStateHooks(args)} />
              </MockedProvider>
            );

            expect(
              mockHistory.replace.mock.calls[mockHistory.replace.mock.calls.length - 1][0]
            ).toEqual({
              hash: '',
              pathname: examplePath,
              search: [CONSTANTS.overviewPage, CONSTANTS.timelinePage].includes(page)
                ? '?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))'
                : `?query=(language:kuery,query:'host.name:%22siem-es%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`,
              state: '',
            });
          }
        );
      });
    });
  });
});

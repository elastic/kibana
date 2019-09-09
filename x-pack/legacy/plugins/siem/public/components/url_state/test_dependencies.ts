/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { hostsModel, networkModel, SerializedFilterQuery } from '../../store';
import { UrlStateContainerPropTypes, LocationTypes, KqlQuery } from './types';
import { CONSTANTS } from './constants';
import { InputsModelId } from '../../store/inputs/constants';
import { DispatchUpdateTimeline } from '../open_timeline/types';
import { navTabs, SiemPageName } from '../../pages/home/home_navigations';
import { HostsTableType } from '../../store/hosts/model';

type Action = 'PUSH' | 'POP' | 'REPLACE';
const pop: Action = 'POP';

export const getFilterQuery = (queryLocation: LocationTypes): KqlQuery => ({
  filterQuery: {
    expression: 'host.name:"siem-es"',
    kind: 'kuery',
  },
  queryLocation,
});

const defaultLocation = {
  hash: '',
  pathname: '/network',
  search: '',
  state: '',
};

export const mockHistory = {
  action: pop,
  block: jest.fn(),
  createHref: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  length: 2,
  listen: jest.fn(),
  location: defaultLocation,
  push: jest.fn(),
  replace: jest.fn(),
};

export const defaultProps: UrlStateContainerPropTypes = {
  pageName: SiemPageName.network,
  detailName: undefined,
  tabName: HostsTableType.authentications,
  search: '',
  pathName: '/network',
  navTabs,
  indexPattern: {
    fields: [
      {
        aggregatable: true,
        name: '@timestamp',
        searchable: true,
        type: 'date',
      },
    ],
    title: 'filebeat-*,packetbeat-*',
  },
  urlState: {
    [CONSTANTS.timerange]: {
      global: {
        [CONSTANTS.timerange]: {
          from: 1558048243696,
          fromStr: 'now-24h',
          kind: 'relative',
          to: 1558134643697,
          toStr: 'now',
        },
        linkTo: ['timeline'],
      },
      timeline: {
        [CONSTANTS.timerange]: {
          from: 1558048243696,
          fromStr: 'now-24h',
          kind: 'relative',
          to: 1558134643697,
          toStr: 'now',
        },
        linkTo: ['global'],
      },
    },
    [CONSTANTS.kqlQuery]: {
      filterQuery: null,
      queryLocation: null,
    },
    [CONSTANTS.timelineId]: '',
  },
  addGlobalLinkTo: (jest.fn() as unknown) as ActionCreator<{ linkToId: InputsModelId }>,
  addTimelineLinkTo: (jest.fn() as unknown) as ActionCreator<{ linkToId: InputsModelId }>,
  dispatch: jest.fn(),
  removeGlobalLinkTo: (jest.fn() as unknown) as ActionCreator<void>,
  removeTimelineLinkTo: (jest.fn() as unknown) as ActionCreator<void>,
  setAbsoluteTimerange: (jest.fn() as unknown) as ActionCreator<{
    from: number;
    fromStr: undefined;
    id: InputsModelId;
    to: number;
    toStr: undefined;
  }>,
  setHostsKql: (jest.fn() as unknown) as ActionCreator<{
    filterQuery: SerializedFilterQuery;
    hostsType: hostsModel.HostsType;
  }>,
  setNetworkKql: (jest.fn() as unknown) as ActionCreator<{
    filterQuery: SerializedFilterQuery;
    networkType: networkModel.NetworkType;
  }>,
  setRelativeTimerange: (jest.fn() as unknown) as ActionCreator<{
    from: number;
    fromStr: string;
    id: InputsModelId;
    to: number;
    toStr: string;
  }>,
  updateTimeline: (jest.fn() as unknown) as DispatchUpdateTimeline,
  updateTimelineIsLoading: (jest.fn() as unknown) as ActionCreator<{
    id: string;
    isLoading: boolean;
  }>,
  history: {
    ...mockHistory,
    location: defaultLocation,
  },
};

export const getMockProps = (
  location = defaultLocation,
  kqlQueryKey = CONSTANTS.networkPage,
  kqlQueryValue: KqlQuery | null,
  pageName: string,
  detailName: string | undefined
): UrlStateContainerPropTypes => ({
  ...defaultProps,
  urlState: {
    ...defaultProps.urlState,
    [CONSTANTS.kqlQuery]: kqlQueryValue || { filterQuery: null, queryLocation: null },
  },
  history: {
    ...mockHistory,
    location,
  },
  detailName,
  pageName,
  pathName: location.pathname,
  search: location.search,
});

interface GetMockPropsObj {
  examplePath: string;
  namespaceLower: string;
  page: LocationTypes;
  pageName: string;
  detailName: string | undefined;
}

export const getMockPropsObj = ({
  page,
  examplePath,
  namespaceLower,
  pageName,
  detailName,
}: GetMockPropsObj) => ({
  noSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: '?_g=()',
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: '?_g=()',
        state: '',
      },
      page,
      getFilterQuery(page),
      pageName,
      detailName
    ),
  },
  relativeTimeSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${page})&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${page})&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      getFilterQuery(page),
      pageName,
      detailName
    ),
  },
  absoluteTimeSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search:
          '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1556736012685,kind:absolute,to:1556822416082)),timeline:(linkTo:!(global),timerange:(from:1556736012685,kind:absolute,to:1556822416082)))',
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
    definedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search:
          '?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1556736012685,kind:absolute,to:1556822416082)),timeline:(linkTo:!(global),timerange:(from:1556736012685,kind:absolute,to:1556822416082)))',
        state: '',
      },
      page,
      getFilterQuery(page),
      pageName,
      detailName
    ),
  },
  oppositeQueryLocationSearch: {
    undefinedQuery: getMockProps(
      {
        hash: '',
        pathname: examplePath,
        search: `?_g=()&kqlQuery=(filterQuery:(expression:'host.name:%22siem-es%22',kind:kuery),queryLocation:${
          namespaceLower === 'hosts' ? 'network' : 'hosts'
        }.page)&timerange=(global:(linkTo:!(),timerange:(from:1558591200000,fromStr:now-1d%2Fd,kind:relative,to:1558677599999,toStr:now-1d%2Fd)),timeline:(linkTo:!(),timerange:(from:1558732849370,fromStr:now-15m,kind:relative,to:1558733749370,toStr:now)))`,
        state: '',
      },
      page,
      null,
      pageName,
      detailName
    ),
  },
});

// silly that this needs to be an array and not an object
// https://jestjs.io/docs/en/api#testeachtable-name-fn-timeout
export const testCases = [
  [
    /* page */ CONSTANTS.networkPage,
    /* namespaceLower */ 'network',
    /* namespaceUpper */ 'Network',
    /* pathName */ '/network',
    /* type */ networkModel.NetworkType.page,
    /* pageName */ SiemPageName.network,
    /* detailName */ undefined,
  ],
  [
    /* page */ CONSTANTS.hostsPage,
    /* namespaceLower */ 'hosts',
    /* namespaceUpper */ 'Hosts',
    /* pathName */ '/hosts',
    /* type */ hostsModel.HostsType.page,
    /* pageName */ SiemPageName.hosts,
    /* detailName */ undefined,
  ],
  [
    /* page */ CONSTANTS.hostsDetails,
    /* namespaceLower */ 'hosts',
    /* namespaceUpper */ 'Hosts',
    /* pathName */ '/hosts/siem-es',
    /* type */ hostsModel.HostsType.details,
    /* pageName */ SiemPageName.hosts,
    /* detailName */ 'host-test',
  ],
  [
    /* page */ CONSTANTS.networkDetails,
    /* namespaceLower */ 'network',
    /* namespaceUpper */ 'Network',
    /* pathName */ '/network/ip/100.90.80',
    /* type */ networkModel.NetworkType.details,
    /* pageName */ SiemPageName.network,
    /* detailName */ '100.90.80',
  ],
  [
    /* page */ CONSTANTS.overviewPage,
    /* namespaceLower */ 'overview',
    /* namespaceUpper */ 'Overview',
    /* pathName */ '/overview',
    /* type */ null,
    /* pageName */ SiemPageName.overview,
    /* detailName */ undefined,
  ],
  [
    /* page */ CONSTANTS.timelinePage,
    /* namespaceLower */ 'timeline',
    /* namespaceUpper */ 'Timeline',
    /* pathName */ '/timeline',
    /* type */ null,
    /* pageName */ SiemPageName.timelines,
    /* detailName */ undefined,
  ],
];

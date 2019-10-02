/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMELINE_WIDTH } from '../components/timeline/body/helpers';
import {
  Direction,
  DomainsFields,
  FlowDirection,
  FlowTarget,
  HostsFields,
  NetworkDnsFields,
  NetworkTopNFlowFields,
  TlsFields,
  UsersFields,
} from '../graphql/types';
import { State } from '../store';

import { defaultHeaders } from './header';
import {
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
} from '../../common/constants';

export const mockGlobalState: State = {
  app: {
    notesById: {},
    errors: [
      { id: 'error-id-1', title: 'title-1', message: ['error-message-1'] },
      { id: 'error-id-2', title: 'title-2', message: ['error-message-2'] },
    ],
  },
  hosts: {
    page: {
      queries: {
        authentications: { activePage: 0, limit: 10 },
        allHosts: {
          activePage: 0,
          limit: 10,
          direction: Direction.desc,
          sortField: HostsFields.lastSeen,
        },
        events: { activePage: 0, limit: 10 },
        uncommonProcesses: { activePage: 0, limit: 10 },
        anomalies: null,
      },
      filterQuery: null,
      filterQueryDraft: null,
    },
    details: {
      queries: {
        authentications: { activePage: 0, limit: 10 },
        allHosts: {
          activePage: 0,
          limit: 10,
          direction: Direction.desc,
          sortField: HostsFields.lastSeen,
        },
        events: { activePage: 0, limit: 10 },
        uncommonProcesses: { activePage: 0, limit: 10 },
        anomalies: null,
      },
      filterQuery: null,
      filterQueryDraft: null,
    },
  },
  network: {
    page: {
      queries: {
        topNFlowSource: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: NetworkTopNFlowFields.bytes_out, direction: Direction.desc },
        },
        topNFlowDestination: {
          activePage: 0,
          limit: 10,
          topNFlowSort: { field: NetworkTopNFlowFields.bytes_out, direction: Direction.desc },
        },
        dns: {
          activePage: 0,
          limit: 10,
          dnsSortField: { field: NetworkDnsFields.queryCount, direction: Direction.desc },
          isPtrIncluded: false,
        },
      },
      filterQuery: null,
      filterQueryDraft: null,
    },
    details: {
      filterQuery: null,
      filterQueryDraft: null,
      flowTarget: FlowTarget.source,
      queries: {
        domains: {
          activePage: 0,
          limit: 10,
          flowDirection: FlowDirection.uniDirectional,
          domainsSortField: { field: DomainsFields.bytes, direction: Direction.desc },
        },
        tls: {
          activePage: 0,
          limit: 10,
          tlsSortField: { field: TlsFields._id, direction: Direction.desc },
        },
        users: {
          activePage: 0,
          limit: 10,
          usersSortField: { field: UsersFields.name, direction: Direction.asc },
        },
      },
    },
  },
  inputs: {
    global: {
      timerange: { kind: 'relative', fromStr: DEFAULT_FROM, toStr: DEFAULT_TO, from: 0, to: 1 },
      linkTo: ['timeline'],
      query: [],
      policy: { kind: DEFAULT_INTERVAL_TYPE, duration: DEFAULT_INTERVAL_VALUE },
    },
    timeline: {
      timerange: { kind: 'relative', fromStr: DEFAULT_FROM, toStr: DEFAULT_TO, from: 0, to: 1 },
      linkTo: ['global'],
      query: [],
      policy: { kind: DEFAULT_INTERVAL_TYPE, duration: DEFAULT_INTERVAL_VALUE },
    },
  },
  dragAndDrop: { dataProviders: {} },
  timeline: {
    showCallOutUnauthorizedMsg: false,
    autoSavedWarningMsg: {
      timelineId: null,
      newTimelineModel: null,
    },
    timelineById: {
      test: {
        id: 'test',
        savedObjectId: null,
        columns: defaultHeaders,
        itemsPerPage: 5,
        dataProviders: [],
        description: '',
        eventIdToNoteIds: {},
        highlightedDropAndProviderId: '',
        historyIds: [],
        isFavorite: false,
        isLive: false,
        isLoading: false,
        kqlMode: 'filter',
        kqlQuery: { filterQuery: null, filterQueryDraft: null },
        title: '',
        noteIds: [],
        dateRange: {
          start: 0,
          end: 0,
        },
        show: false,
        pinnedEventIds: {},
        pinnedEventsSaveObject: {},
        itemsPerPageOptions: [5, 10, 20],
        sort: { columnId: '@timestamp', sortDirection: Direction.desc },
        width: DEFAULT_TIMELINE_WIDTH,
        isSaving: false,
        version: null,
      },
    },
  },
};

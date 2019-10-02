/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyHostsFilterQuery as dispatchApplyHostsFilterQuery } from '../../store/hosts/actions';
import { applyNetworkFilterQuery as dispatchApplyNetworkFilterQuery } from '../../store/network/actions';
import { applyKqlFilterQuery as dispatchApplyTimelineFilterQuery } from '../../store/timeline/actions';

import { mockIndexPattern } from '../../mock/index_pattern';
import { useUpdateKql } from './use_update_kql';
import { HostsType } from '../../store/hosts/model';
import { NetworkType } from '../../store/network/model';

const mockDispatch = jest.fn();
mockDispatch.mockImplementation(fn => fn);

const applyHostsKqlMock: jest.Mock = (dispatchApplyHostsFilterQuery as unknown) as jest.Mock;
const applyNetworkKqlMock: jest.Mock = (dispatchApplyNetworkFilterQuery as unknown) as jest.Mock;
const applyTimelineKqlMock: jest.Mock = (dispatchApplyTimelineFilterQuery as unknown) as jest.Mock;

jest.mock('../../store/hosts/actions', () => ({
  applyHostsFilterQuery: jest.fn(),
}));
jest.mock('../../store/network/actions', () => ({
  applyNetworkFilterQuery: jest.fn(),
}));
jest.mock('../../store/timeline/actions', () => ({
  applyKqlFilterQuery: jest.fn(),
}));

describe('#useUpdateKql', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    applyHostsKqlMock.mockClear();
    applyNetworkKqlMock.mockClear();
    applyTimelineKqlMock.mockClear();
  });

  test('We should apply host kql on host page', () => {
    useUpdateKql({
      indexPattern: mockIndexPattern,
      kueryFilterQuery: { expression: '', kind: 'kuery' },
      kueryFilterQueryDraft: { expression: 'host.name: "myLove"', kind: 'kuery' },
      storeType: 'hostsType',
      type: HostsType.page,
    })(mockDispatch);
    expect(applyHostsKqlMock).toHaveBeenCalledWith({
      filterQuery: {
        kuery: {
          expression: 'host.name: "myLove"',
          kind: 'kuery',
        },
        serializedQuery:
          '{"bool":{"should":[{"match_phrase":{"host.name":"myLove"}}],"minimum_should_match":1}}',
      },
      hostsType: 'page',
    });
    expect(applyNetworkKqlMock).not.toHaveBeenCalled();
    expect(applyTimelineKqlMock).not.toHaveBeenCalled();
  });

  test('We should apply host kql on host details page', () => {
    useUpdateKql({
      indexPattern: mockIndexPattern,
      kueryFilterQuery: { expression: '', kind: 'kuery' },
      kueryFilterQueryDraft: { expression: 'host.name: "myLove"', kind: 'kuery' },
      storeType: 'hostsType',
      type: HostsType.details,
    })(mockDispatch);
    expect(applyHostsKqlMock).toHaveBeenCalledWith({
      filterQuery: {
        kuery: {
          expression: 'host.name: "myLove"',
          kind: 'kuery',
        },
        serializedQuery:
          '{"bool":{"should":[{"match_phrase":{"host.name":"myLove"}}],"minimum_should_match":1}}',
      },
      hostsType: 'details',
    });
    expect(applyNetworkKqlMock).not.toHaveBeenCalled();
    expect(applyTimelineKqlMock).not.toHaveBeenCalled();
  });

  test('We should apply network kql on network page', () => {
    useUpdateKql({
      indexPattern: mockIndexPattern,
      kueryFilterQuery: { expression: '', kind: 'kuery' },
      kueryFilterQueryDraft: { expression: 'host.name: "myLove"', kind: 'kuery' },
      storeType: 'networkType',
      type: NetworkType.page,
    })(mockDispatch);
    expect(applyNetworkKqlMock).toHaveBeenCalledWith({
      filterQuery: {
        kuery: {
          expression: 'host.name: "myLove"',
          kind: 'kuery',
        },
        serializedQuery:
          '{"bool":{"should":[{"match_phrase":{"host.name":"myLove"}}],"minimum_should_match":1}}',
      },
      networkType: 'page',
    });
    expect(applyHostsKqlMock).not.toHaveBeenCalled();
    expect(applyTimelineKqlMock).not.toHaveBeenCalled();
  });

  test('We should apply network kql on network details page', () => {
    useUpdateKql({
      indexPattern: mockIndexPattern,
      kueryFilterQuery: { expression: '', kind: 'kuery' },
      kueryFilterQueryDraft: { expression: 'host.name: "myLove"', kind: 'kuery' },
      storeType: 'networkType',
      type: NetworkType.details,
    })(mockDispatch);
    expect(applyNetworkKqlMock).toHaveBeenCalledWith({
      filterQuery: {
        kuery: {
          expression: 'host.name: "myLove"',
          kind: 'kuery',
        },
        serializedQuery:
          '{"bool":{"should":[{"match_phrase":{"host.name":"myLove"}}],"minimum_should_match":1}}',
      },
      networkType: 'details',
    });
    expect(applyHostsKqlMock).not.toHaveBeenCalled();
    expect(applyTimelineKqlMock).not.toHaveBeenCalled();
  });

  test('We should apply timeline kql', () => {
    useUpdateKql({
      indexPattern: mockIndexPattern,
      kueryFilterQuery: { expression: '', kind: 'kuery' },
      kueryFilterQueryDraft: { expression: 'host.name: "myLove"', kind: 'kuery' },
      storeType: 'timelineType',
      type: NetworkType.page,
      timelineId: 'myTimelineId',
    })(mockDispatch);
    expect(applyTimelineKqlMock).toHaveBeenCalledWith({
      filterQuery: {
        kuery: {
          expression: 'host.name: "myLove"',
          kind: 'kuery',
        },
        serializedQuery:
          '{"bool":{"should":[{"match_phrase":{"host.name":"myLove"}}],"minimum_should_match":1}}',
      },
      id: 'myTimelineId',
    });
    expect(applyHostsKqlMock).not.toHaveBeenCalled();
    expect(applyNetworkKqlMock).not.toHaveBeenCalled();
  });
});

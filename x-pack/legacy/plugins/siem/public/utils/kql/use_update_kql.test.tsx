/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyKqlFilterQuery as dispatchApplyTimelineFilterQuery } from '../../store/timeline/actions';

import { mockIndexPattern } from '../../mock/index_pattern';
import { useUpdateKql } from './use_update_kql';

const mockDispatch = jest.fn();
mockDispatch.mockImplementation(fn => fn);

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
    applyTimelineKqlMock.mockClear();
  });

  test('We should apply timeline kql', () => {
    useUpdateKql({
      indexPattern: mockIndexPattern,
      kueryFilterQuery: { expression: '', kind: 'kuery' },
      kueryFilterQueryDraft: { expression: 'host.name: "myLove"', kind: 'kuery' },
      storeType: 'timelineType',
      type: null,
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
  });
});

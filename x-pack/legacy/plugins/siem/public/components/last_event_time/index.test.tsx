/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { getEmptyValue } from '../empty_value';
import { LastEventIndexKey } from '../../graphql/types';
import { mockLastEventTimeQuery } from '../../containers/events/last_event_time/mock';

import { useMountAppended } from '../../utils/use_mount_appended';
import { useLastEventTimeQuery } from '../../containers/events/last_event_time';
import { TestProviders } from '../../mock';
import '../../mock/ui_settings';

import { LastEventTime } from '.';

const mockUseLastEventTimeQuery: jest.Mock = useLastEventTimeQuery as jest.Mock;
jest.mock('../../containers/events/last_event_time', () => ({
  useLastEventTimeQuery: jest.fn(),
}));

describe('Last Event Time Stat', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    mockUseLastEventTimeQuery.mockReset();
  });

  test('Loading', async () => {
    mockUseLastEventTimeQuery.mockImplementation(() => ({
      loading: true,
      lastSeen: null,
      errorMessage: null,
    }));
    const wrapper = mount(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} />
      </TestProviders>
    );
    expect(wrapper.html()).toBe(
      '<span class="euiLoadingSpinner euiLoadingSpinner--medium"></span>'
    );
  });
  test('Last seen', async () => {
    mockUseLastEventTimeQuery.mockImplementation(() => ({
      loading: false,
      lastSeen: mockLastEventTimeQuery[0].result.data!.source.LastEventTime.lastSeen,
      errorMessage: mockLastEventTimeQuery[0].result.data!.source.LastEventTime.errorMessage,
    }));
    const wrapper = mount(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} />
      </TestProviders>
    );
    expect(wrapper.html()).toBe('Last event: <span class="euiToolTipAnchor">12 minutes ago</span>');
  });
  test('Bad date time string', async () => {
    mockUseLastEventTimeQuery.mockImplementation(() => ({
      loading: false,
      lastSeen: 'something-invalid',
      errorMessage: mockLastEventTimeQuery[0].result.data!.source.LastEventTime.errorMessage,
    }));
    const wrapper = mount(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} />
      </TestProviders>
    );

    expect(wrapper.html()).toBe('something-invalid');
  });
  test('Null time string', async () => {
    mockUseLastEventTimeQuery.mockImplementation(() => ({
      loading: false,
      lastSeen: null,
      errorMessage: mockLastEventTimeQuery[0].result.data!.source.LastEventTime.errorMessage,
    }));
    const wrapper = mount(
      <TestProviders>
        <LastEventTime indexKey={LastEventIndexKey.hosts} />
      </TestProviders>
    );
    expect(wrapper.html()).toContain(getEmptyValue());
  });
});

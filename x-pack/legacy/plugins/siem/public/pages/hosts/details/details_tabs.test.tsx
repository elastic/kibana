/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';
import { StaticIndexPattern } from 'ui/index_patterns';
import { npSetup } from 'ui/new_platform';
import { MemoryRouter } from 'react-router-dom';

import { mockIndexPattern } from '../../../mock/index_pattern';
import { TestProviders } from '../../../mock/test_providers';
import { mockUiSettings, MockNpSetUp } from '../../../mock/ui_settings';
import { HostDetailsTabs } from './details_tabs';
import { SetAbsoluteRangeDatePicker } from './types';
import { hostDetailsPagePath } from '../types';
import { type } from './utils';

const mockNpSetup: MockNpSetUp = (npSetup as unknown) as MockNpSetUp;
jest.mock('ui/new_platform');
mockNpSetup.core.uiSettings = mockUiSettings;

jest.mock('../../../containers/source', () => ({
  indicesExistOrDataTemporarilyUnavailable: () => true,
  WithSource: ({
    children,
  }: {
    children: (args: {
      indicesExist: boolean;
      indexPattern: StaticIndexPattern;
    }) => React.ReactNode;
  }) => children({ indicesExist: true, indexPattern: mockIndexPattern }),
}));

describe('body', () => {
  test('it should pass expected object properties to children', () => {
    const wrapper = mount(
      <TestProviders>
        <MemoryRouter initialEntries={[`/hosts/host-1/authentications`]}>
          <HostDetailsTabs
            from={0}
            isInitializing={false}
            detailName={'host-1'}
            setQuery={() => {}}
            to={0}
            setAbsoluteRangeDatePicker={(jest.fn() as unknown) as SetAbsoluteRangeDatePicker}
            hostDetailsPagePath={hostDetailsPagePath}
            indexPattern={mockIndexPattern}
            type={type}
            filterQuery='{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"host.name":{"query":"host-1"}}}],"should":[],"must_not":[]}}'
          />
        </MemoryRouter>
      </TestProviders>
    );

    // match against everything but the functions to ensure they are there as expected
    expect(wrapper.find('AuthenticationsQueryTabBody').props()).toMatchObject({
      endDate: 0,
      filterQuery:
        '{"bool":{"must":[],"filter":[{"match_all":{}},{"match_phrase":{"host.name":{"query":"host-1"}}}],"should":[],"must_not":[]}}',
      skip: false,
      startDate: 0,
      type: 'details',
      indexPattern: {
        fields: [
          { name: '@timestamp', searchable: true, type: 'date', aggregatable: true },
          { name: '@version', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.ephemeral_id', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.hostname', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.id', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test1', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test2', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test3', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test4', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test5', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test6', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test7', searchable: true, type: 'string', aggregatable: true },
          { name: 'agent.test8', searchable: true, type: 'string', aggregatable: true },
          { name: 'host.name', searchable: true, type: 'string', aggregatable: true },
        ],
        title: 'filebeat-*,auditbeat-*,packetbeat-*',
      },
      hostName: 'host-1',
    });
  });
});

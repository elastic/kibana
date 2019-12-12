/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import { MemoryRouter } from 'react-router-dom';

import { mockIndexPattern } from '../../../mock/index_pattern';
import { TestProviders } from '../../../mock/test_providers';
import { mockKibanaCoreFactory } from '../../../mock/kibana_core';
import { HostDetailsTabs } from './details_tabs';
import { SetAbsoluteRangeDatePicker } from './types';
import { hostDetailsPagePath } from '../types';
import { type } from './utils';
import { useMountAppended } from '../../../utils/use_mount_appended';

jest.mock('../../../lib/settings/use_kibana_ui_setting');

jest.mock('../../../lib/compose/kibana_core', () => mockKibanaCoreFactory());

jest.mock('../../../containers/source', () => ({
  indicesExistOrDataTemporarilyUnavailable: () => true,
  WithSource: ({
    children,
  }: {
    children: (args: { indicesExist: boolean; indexPattern: IIndexPattern }) => React.ReactNode;
  }) => children({ indicesExist: true, indexPattern: mockIndexPattern }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../components/query_bar', () => ({
  QueryBar: () => null,
}));

describe('body', () => {
  const scenariosMap = {
    authentications: 'AuthenticationsQueryTabBody',
    allHosts: 'HostsQueryTabBody',
    uncommonProcesses: 'UncommonProcessQueryTabBody',
    anomalies: 'AnomaliesQueryTabBody',
    events: 'EventsQueryTabBody',
  };
  const mount = useMountAppended();

  Object.entries(scenariosMap).forEach(([path, componentName]) =>
    test(`it should pass expected object properties to ${componentName}`, () => {
      const wrapper = mount(
        <TestProviders>
          <MemoryRouter initialEntries={[`/hosts/host-1/${path}`]}>
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
      expect(wrapper.find(componentName).props()).toMatchObject({
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
    })
  );
});

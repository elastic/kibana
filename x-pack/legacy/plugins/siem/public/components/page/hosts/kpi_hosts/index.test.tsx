/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockKpiHostsData, mockKpiHostDetailsData } from './mock';
import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import toJson from 'enzyme-to-json';
import { KpiHostsComponentBase } from '.';
import * as statItems from '../../../stat_items';
import { kpiHostsMapping } from './kpi_hosts_mapping';
import { kpiHostDetailsMapping } from './kpi_host_details_mapping';

describe('kpiHostsComponent', () => {
  const ID = 'kpiHost';
  const from = new Date('2019-06-15T06:00:00.000Z').valueOf();
  const to = new Date('2019-06-18T06:00:00.000Z').valueOf();
  const narrowDateRange = () => {};
  describe('render', () => {
    test('it should render spinner if it is loading', () => {
      const wrapper: ShallowWrapper = shallow(
        <KpiHostsComponentBase
          data={mockKpiHostsData}
          from={from}
          id={ID}
          loading={true}
          narrowDateRange={narrowDateRange}
          to={to}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it should render KpiHostsData', () => {
      const wrapper: ShallowWrapper = shallow(
        <KpiHostsComponentBase
          data={mockKpiHostsData}
          from={from}
          id={ID}
          loading={false}
          narrowDateRange={narrowDateRange}
          to={to}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it should render KpiHostDetailsData', () => {
      const wrapper: ShallowWrapper = shallow(
        <KpiHostsComponentBase
          data={mockKpiHostDetailsData}
          from={from}
          id={ID}
          loading={false}
          narrowDateRange={narrowDateRange}
          to={to}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  const table = [
    [mockKpiHostsData, kpiHostsMapping] as [typeof mockKpiHostsData, typeof kpiHostsMapping],
    [mockKpiHostDetailsData, kpiHostDetailsMapping] as [
      typeof mockKpiHostDetailsData,
      typeof kpiHostDetailsMapping
    ],
  ];

  describe.each(table)(
    'it should handle KpiHostsProps and KpiHostDetailsProps',
    (data, mapping) => {
      let mockUseKpiMatrixStatus: jest.SpyInstance;
      beforeAll(() => {
        mockUseKpiMatrixStatus = jest.spyOn(statItems, 'useKpiMatrixStatus');
      });

      beforeEach(() => {
        shallow(
          <KpiHostsComponentBase
            data={data}
            from={from}
            id={ID}
            loading={false}
            narrowDateRange={narrowDateRange}
            to={to}
          />
        );
      });

      afterEach(() => {
        mockUseKpiMatrixStatus.mockClear();
      });

      afterAll(() => {
        mockUseKpiMatrixStatus.mockRestore();
      });

      test(`it should apply correct mapping by given data type`, () => {
        expect(mockUseKpiMatrixStatus).toBeCalledWith(mapping, data, ID, from, to, narrowDateRange);
      });
    }
  );
});

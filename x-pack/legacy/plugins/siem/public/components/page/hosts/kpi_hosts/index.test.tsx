/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockKpiHostsData, mockKpiHostDetailsData } from './mock';
import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import toJson from 'enzyme-to-json';
import { KpiHostsComponent } from '.';
import * as statItems from '../../../stat_items';
import { kpiHostsMapping } from './kpi_hosts_mapping';
import { kpiHostDetailsMapping } from './kpi_host_details_mapping';

describe('kpiHostsComponent', () => {
  const ID = 'kpiHost';
  const from = new Date('2019-06-15T06:00:00.000Z').valueOf();
  const to = new Date('2019-06-18T06:00:00.000Z').valueOf();
  describe('render', () => {
    test('it should render spinner if it is loading', () => {
      const wrapper: ShallowWrapper = shallow(
        <KpiHostsComponent data={mockKpiHostsData} from={from} id={ID} loading={true} to={to} />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it should render KpiHostsData', () => {
      const wrapper: ShallowWrapper = shallow(
        <KpiHostsComponent data={mockKpiHostsData} from={from} id={ID} loading={false} to={to} />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it should render KpiHostDetailsData', () => {
      const wrapper: ShallowWrapper = shallow(
        <KpiHostsComponent
          data={mockKpiHostDetailsData}
          from={from}
          id={ID}
          loading={false}
          to={to}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe.each([
    [mockKpiHostsData, kpiHostsMapping],
    [mockKpiHostDetailsData, kpiHostDetailsMapping],
  ])('it should handle KpiHostsProps and KpiHostDetailsProps', (data, mapping) => {
    let mockUseKpiMatrixStatus: jest.SpyInstance;
    beforeAll(() => {
      mockUseKpiMatrixStatus = jest.spyOn(statItems, 'useKpiMatrixStatus');
    });

    beforeEach(() => {
      shallow(<KpiHostsComponent data={data} from={from} id={ID} loading={false} to={to} />);
    });

    afterEach(() => {
      mockUseKpiMatrixStatus.mockClear();
    });

    afterAll(() => {
      mockUseKpiMatrixStatus.mockRestore();
    });

    test(`it should apply correct mapping by given data type`, () => {
      expect(mockUseKpiMatrixStatus).toBeCalledWith(mapping, data, ID, from, to);
    });
  });
});

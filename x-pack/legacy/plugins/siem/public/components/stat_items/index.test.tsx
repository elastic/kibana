/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import {
  StatItemsComponent,
  StatItemsProps,
  addValueToFields,
  addValueToAreaChart,
  addValueToBarChart,
  useKpiMatrixStatus,
  StatItems,
  KpiValue,
} from '.';
import { BarChart } from '../charts/barchart';
import { AreaChart } from '../charts/areachart';
import { EuiHorizontalRule } from '@elastic/eui';
import { mockData, mockEnableChartsData, mockNoChartMappings, mockMappings } from './mock';
import { mockGlobalState, apolloClientObservable } from '../../mock';
import { State, createStore } from '../../store';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { KpiNetworkData, KpiHostsData } from '../../graphql/types';
import { getEmptyTagValue } from '../empty_value';
jest.mock('../charts/barchart');
jest.mock('../charts/areachart');
jest.mock('../empty_value', () => ({
  getEmptyTagValue: jest.fn().mockReturnValue('--'),
}));

const from = new Date('2019-06-15T06:00:00.000Z').valueOf();
const to = new Date('2019-06-18T06:00:00.000Z').valueOf();

describe('Stat Items Component', () => {
  const state: State = mockGlobalState;
  const store = createStore(state, apolloClientObservable);
  const mockHostsValue = null;

  describe.each([
    [
      mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent
            fields={[{ key: 'hosts', value: mockHostsValue, color: '#3185FC', icon: 'cross' }]}
            description="HOSTS"
            from={from}
            id="statItems"
            index={0}
            key="mock-keys"
            to={to}
          />
        </ReduxStoreProvider>
      ),
    ],
    [
      mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent
            fields={[{ key: 'hosts', value: mockHostsValue, color: '#3185FC', icon: 'cross' }]}
            description="HOSTS"
            areaChart={[]}
            barChart={[]}
            from={from}
            id="statItems"
            index={0}
            key="mock-keys"
            to={to}
          />
        </ReduxStoreProvider>
      ),
    ],
  ])('disable charts', wrapper => {
    test('it renders the default widget', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should render titles', () => {
      expect(
        wrapper
          .find('[data-test-subj="stat-title"]')
          .at(0)
          .text()
      ).toEqual(`-- `);
    });

    test('should display titles with getEmptyTagValue if is null', () => {
      expect(getEmptyTagValue).toHaveBeenCalled();
    });

    test('should not render icons', () => {
      expect(wrapper.find('[data-test-subj="stat-icon"]').filter('EuiIcon')).toHaveLength(0);
    });

    test('should not render barChart', () => {
      expect(wrapper.find(BarChart)).toHaveLength(0);
    });

    test('should not render areaChart', () => {
      expect(wrapper.find(AreaChart)).toHaveLength(0);
    });

    test('should not render spliter', () => {
      expect(wrapper.find(EuiHorizontalRule)).toHaveLength(0);
    });
  });

  describe('rendering kpis with charts', () => {
    const mockUniqueDestinationIps = 2359;
    const mockUniqueDestinationIpsRenderer = jest
      .fn()
      .mockReturnValue(mockUniqueDestinationIps.toLocaleString());
    const mockStatItemsData: StatItemsProps<KpiValue> = {
      fields: [
        {
          key: 'uniqueSourceIps',
          description: 'Source',
          value: 1714,
          color: '#DB1374',
          icon: 'cross',
        },
        {
          key: 'uniqueDestinationIps',
          description: 'Dest.',
          value: mockUniqueDestinationIps,
          color: '#490092',
          icon: 'cross',
          render: mockUniqueDestinationIpsRenderer,
        },
      ],
      enableAreaChart: true,
      enableBarChart: true,
      areaChart: [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').valueOf(), y: 565975 },
            { x: new Date('2019-05-04T01:00:00.000Z').valueOf(), y: 1084366 },
            { x: new Date('2019-05-04T13:00:00.000Z').valueOf(), y: 12280 },
          ],
          color: '#490092',
        },
      ],
      barChart: [
        { key: 'uniqueSourceIps', value: [{ x: 'uniqueSourceIps', y: '1714' }], color: '#DB1374' },
        {
          key: 'uniqueDestinationIps',
          value: [{ x: 'uniqueDestinationIps', y: 2354 }],
          color: '#490092',
        },
      ],
      description: 'UNIQUE_PRIVATE_IPS',
      from,
      id: 'statItems',
      index: 0,
      key: 'mock-keys',
      to,
    };
    let wrapper: ReactWrapper;
    beforeAll(() => {
      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent {...mockStatItemsData} />
        </ReduxStoreProvider>
      );
    });

    afterAll(() => {
      mockUniqueDestinationIpsRenderer.mockClear();
    });

    test('it renders the default widget', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should handle multiple titles', () => {
      expect(wrapper.find('[data-test-subj="stat-title"]')).toHaveLength(2);
    });

    test('should render titles with default renderer', () => {
      expect(
        wrapper
          .find('[data-test-subj="stat-title"]')
          .at(0)
          .text()
      ).toEqual('1714 Source');
    });

    test('should render titles with given renderer', () => {
      expect(mockUniqueDestinationIpsRenderer).toHaveBeenCalledWith(mockUniqueDestinationIps);
      expect(
        wrapper
          .find('[data-test-subj="stat-title"]')
          .at(1)
          .text()
      ).toEqual('2,359 Dest.');
    });

    test('should render kpi icons', () => {
      expect(wrapper.find('[data-test-subj="stat-icon"]').filter('EuiIcon')).toHaveLength(2);
    });

    test('should render barChart', () => {
      expect(wrapper.find(BarChart)).toHaveLength(1);
    });

    test('should render areaChart', () => {
      expect(wrapper.find(AreaChart)).toHaveLength(1);
    });

    test('should render separator', () => {
      expect(wrapper.find(EuiHorizontalRule)).toHaveLength(1);
    });
  });
});

describe('addValueToFields', () => {
  const mockNetworkMappings = mockMappings[0];
  const mockKpiNetworkData = mockData.KpiNetwork;
  test('should update value from data', () => {
    const result = addValueToFields(mockNetworkMappings.fields, mockKpiNetworkData);
    expect(result).toEqual(mockEnableChartsData.fields);
  });
});

describe('addValueToAreaChart', () => {
  const mockNetworkMappings = mockMappings[0];
  const mockKpiNetworkData = mockData.KpiNetwork;
  test('should add areaChart from data', () => {
    const result = addValueToAreaChart(mockNetworkMappings.fields, mockKpiNetworkData);
    expect(result).toEqual(mockEnableChartsData.areaChart);
  });
});

describe('addValueToBarChart', () => {
  const mockNetworkMappings = mockMappings[0];
  const mockKpiNetworkData = mockData.KpiNetwork;
  test('should add areaChart from data', () => {
    const result = addValueToBarChart(mockNetworkMappings.fields, mockKpiNetworkData);
    expect(result).toEqual(mockEnableChartsData.barChart);
  });
});

describe('useKpiMatrixStatus', () => {
  const mockNetworkMappings = mockMappings;
  const mockKpiNetworkData = mockData.KpiNetwork;
  const MockChildComponent = (mappedStatItemProps: StatItemsProps<KpiValue>) => <span />;
  const MockHookWrapperComponent = ({
    fieldsMapping,
    data,
  }: {
    fieldsMapping: Readonly<Array<StatItems<KpiValue>>>;
    data: KpiNetworkData | KpiHostsData;
  }) => {
    const statItemsProps: Readonly<Array<StatItemsProps<KpiValue>>> = useKpiMatrixStatus(
      fieldsMapping as Array<StatItemsProps<KpiValue>>,
      data,
      'statItem',
      from,
      to
    );

    return (
      <div>
        {statItemsProps.map(mappedStatItemProps => {
          return <MockChildComponent {...mappedStatItemProps} />;
        })}
      </div>
    );
  };

  test('it updates status correctly', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNetworkMappings} data={mockKpiNetworkData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props).toEqual(mockEnableChartsData);
  });

  test('it should not append areaChart if enableAreaChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} data={mockKpiNetworkData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.areaChart).toBeUndefined();
  });

  test('it should not append barChart if enableBarChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} data={mockKpiNetworkData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.barChart).toBeUndefined();
  });
});

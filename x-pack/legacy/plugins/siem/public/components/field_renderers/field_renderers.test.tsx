/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';

import { FlowTarget, GetIpOverviewQuery, HostEcsFields } from '../../graphql/types';
import { TestProviders } from '../../mock';
import { getEmptyValue } from '../empty_value';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostNameRenderer,
  locationRenderer,
  whoisRenderer,
  reputationRenderer,
  DefaultFieldRenderer,
  DEFAULT_MORE_MAX_HEIGHT,
  MoreContainer,
} from './field_renderers';
import { mockData } from '../page/network/ip_overview/mock';

type AutonomousSystem = GetIpOverviewQuery.AutonomousSystem;

describe('Field Renderers', () => {
  describe('#locationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          {locationRenderer(['source.geo.city_name', 'source.geo.region_name'], mockData.complete)}
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when no fields provided', () => {
      const wrapper = mount(
        <TestProviders>{locationRenderer([], mockData.complete)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when invalid fields provided', () => {
      const wrapper = mount(
        <TestProviders>
          {locationRenderer(['source.geo.my_house'], mockData.complete)}
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#dateRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>{dateRenderer('firstSeen', mockData.complete.source!)}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      const wrapper = mount(
        <TestProviders>{dateRenderer('geo.spark_plug', mockData.complete.source!)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#autonomousSystemRenderer', () => {
    const emptyMock: AutonomousSystem = { organization: {}, number: null };
    const halfEmptyMock: AutonomousSystem = { organization: { name: 'Test Org' }, number: null };

    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          {autonomousSystemRenderer(mockData.complete.source!.autonomousSystem!, FlowTarget.source)}
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-string field provided', () => {
      const wrapper = mount(
        <TestProviders>{autonomousSystemRenderer(halfEmptyMock, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      const wrapper = mount(
        <TestProviders>{autonomousSystemRenderer(emptyMock, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#hostIdRenderer', () => {
    const emptyIdHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: null,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: ['test'],
      ip: null,
    };
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.10')}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.11')}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIdHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIpHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#hostNameRenderer', () => {
    const emptyIdHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: null,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: ['test'],
      ip: null,
    };
    const emptyNameHost: Partial<HostEcsFields> = {
      name: null,
      id: ['test'],
      ip: ['10.10.10.10'],
    };
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.10')}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.11')}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIdHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIpHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
    test('it renders emptyTagValue when no host.name is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyNameHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#whoisRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>{whoisRenderer('10.10.10.10')}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('#reputationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>{reputationRenderer('10.10.10.10')}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('DefaultFieldRenderer', () => {
    test('it should render a single item', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultFieldRenderer rowItems={['item1']} attrName={'item1'} idPrefix={'prefix-1'} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('item1 ');
    });

    test('it should render two items', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultFieldRenderer
            displayCount={5}
            rowItems={['item1', 'item2']}
            attrName={'item1'}
            idPrefix={'prefix-1'}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('item1,item2 ');
    });

    test('it should render all items when the item count exactly equals displayCount', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultFieldRenderer
            displayCount={5}
            rowItems={['item1', 'item2', 'item3', 'item4', 'item5']}
            attrName={'item1'}
            idPrefix={'prefix-1'}
          />
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('item1,item2,item3,item4,item5 ');
    });

    test('it should render all items up to displayCount and the expected "+ n More" popover anchor text for items greater than displayCount', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultFieldRenderer
            displayCount={5}
            rowItems={['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7']}
            attrName={'item1'}
            idPrefix={'prefix-1'}
          />
        </TestProviders>
      );

      expect(wrapper.text()).toEqual('item1,item2,item3,item4,item5  ,+2 More');
    });
  });

  describe('MoreContainer', () => {
    const idPrefix = 'prefix-1';
    const rowItems = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7'];

    test('it should only render the items after overflowIndexStart', () => {
      const wrapper = mountWithIntl(
        <MoreContainer
          idPrefix={idPrefix}
          rowItems={rowItems}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
        />
      );

      expect(wrapper.text()).toEqual('item6item7');
    });

    test('it should render all the items when overflowIndexStart is zero', () => {
      const wrapper = mountWithIntl(
        <MoreContainer
          idPrefix={idPrefix}
          rowItems={rowItems}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={0}
        />
      );

      expect(wrapper.text()).toEqual('item1item2item3item4item5item6item7');
    });

    test('it should have the overflow `auto` style to enable scrolling when necessary', () => {
      const wrapper = mountWithIntl(
        <MoreContainer
          idPrefix={idPrefix}
          rowItems={rowItems}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="more-container"]')
          .first()
          .props().style!.overflow
      ).toEqual('auto');
    });

    test('it should use the moreMaxHeight prop as the value for the max-height style', () => {
      const wrapper = mountWithIntl(
        <MoreContainer
          idPrefix={idPrefix}
          rowItems={rowItems}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
        />
      );

      expect(
        wrapper
          .find('[data-test-subj="more-container"]')
          .first()
          .props().style!.maxHeight
      ).toEqual(DEFAULT_MORE_MAX_HEIGHT);
    });

    test('it should only invoke the optional render function, when provided, for the items after overflowIndexStart', () => {
      const render = jest.fn();

      mountWithIntl(
        <MoreContainer
          idPrefix={idPrefix}
          render={render}
          rowItems={rowItems}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
        />
      );

      expect(render).toHaveBeenCalledTimes(2);
    });
  });
});

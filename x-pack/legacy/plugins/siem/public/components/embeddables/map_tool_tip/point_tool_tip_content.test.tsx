/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { FeatureProperty } from '../types';
import { getRenderedFieldValue, PointToolTipContent } from './point_tool_tip_content';
import { TestProviders } from '../../../mock';
import { getEmptyStringTag } from '../../empty_value';
import { HostDetailsLink, IPDetailsLink } from '../../links';

jest.mock('../../search_bar', () => ({
  siemFilterManager: {
    addFilters: jest.fn(),
  },
}));

describe('PointToolTipContent', () => {
  const mockFeatureProps: FeatureProperty[] = [
    {
      _propertyKey: 'host.name',
      _rawValue: 'testPropValue',
      getESFilters: () => new Promise(resolve => setTimeout(resolve)),
    },
  ];

  test('renders correctly against snapshot', () => {
    const closeTooltip = jest.fn();

    const wrapper = shallow(
      <TestProviders>
        <PointToolTipContent
          contextId={'contextId'}
          featureProps={mockFeatureProps}
          closeTooltip={closeTooltip}
        />
      </TestProviders>
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  describe('#getRenderedFieldValue', () => {
    test('it returns empty tag if value is empty', () => {
      expect(getRenderedFieldValue('host.name', '')).toStrictEqual(getEmptyStringTag());
    });

    test('it returns HostDetailsLink if field is host.name', () => {
      const value = 'suricata-ross';
      expect(getRenderedFieldValue('host.name', value)).toStrictEqual(
        <HostDetailsLink hostName={value} />
      );
    });

    test('it returns IPDetailsLink if field is source.ip', () => {
      const value = '127.0.0.1';
      expect(getRenderedFieldValue('source.ip', value)).toStrictEqual(<IPDetailsLink ip={value} />);
    });

    test('it returns IPDetailsLink if field is destination.ip', () => {
      const value = '127.0.0.1';
      expect(getRenderedFieldValue('destination.ip', value)).toStrictEqual(
        <IPDetailsLink ip={value} />
      );
    });

    test('it returns nothing if field is not host.name or source/destination.ip', () => {
      const value = 'Kramerica.co';
      expect(getRenderedFieldValue('destination.domain', value)).toStrictEqual(<>{value}</>);
    });
  });
});

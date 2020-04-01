/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef } from 'react';
import { shallow } from 'enzyme';

import { AllRulesTables } from './index';

describe('AllRulesTables', () => {
  it('renders correctly against the snapshot', () => {
    const Component = () => {
      const ref = useRef();

      return (
        <AllRulesTables
          euiBasicTableSelectionProps={{}}
          hasNoPermissions={false}
          monitoringColumns={[]}
          paginationMemo={{}}
          rules={[]}
          rulesColumns={[]}
          rulesStatuses={[]}
          sorting={[]}
          tableOnChangeCallback={jest.fn()}
          tableRef={ref}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive()).toMatchSnapshot();
  });
});

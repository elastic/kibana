/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mockAnomalies } from './mock';
import { createDescriptionsList } from './create_descriptions_list';
import { EuiDescriptionList } from '@elastic/eui';

const endDate: number = new Date('3000-01-01T00:00:00.000Z').valueOf();
const narrowDateRange = jest.fn();

describe('create_descriptions_list', () => {
  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <EuiDescriptionList
        data-test-subj="anomaly-description-list"
        listItems={createDescriptionsList(
          mockAnomalies.anomalies[0],
          0,
          endDate,
          'hours',
          narrowDateRange
        )}
      />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});

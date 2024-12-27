/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../kibana_services', () => {
  const MockIndexPatternSelect = (props: unknown) => {
    return <div />;
  };
  const MockHttp = {
    basePath: {
      prepend: (path: string) => {
        return `abc/${path}`;
      },
    },
  };
  return {
    getIndexPatternSelectComponent: () => {
      return MockIndexPatternSelect;
    },
    getHttp: () => {
      return MockHttp;
    },
  };
});

import React from 'react';
import { shallow } from 'enzyme';
import { DataView } from '@kbn/data-plugin/common';
import { GeoIndexPatternSelect } from './geo_index_pattern_select';

const defaultProps = {
  dataView: {
    id: 'weblogs',
    fields: [
      {
        type: 'geo_point',
      },
    ],
  } as unknown as DataView,
  onChange: () => {},
};

test('should render', async () => {
  const component = shallow(<GeoIndexPatternSelect {...defaultProps} />);

  expect(component).toMatchSnapshot();
});

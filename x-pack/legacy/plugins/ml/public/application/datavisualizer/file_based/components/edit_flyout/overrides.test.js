/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { Overrides } from './overrides';

jest.mock('../../../../../../../../../../src/plugins/kibana_react/public', () => ({
  withKibana: comp => {
    return comp;
  },
}));

function getProps() {
  return {
    setOverrides: () => {},
    overrides: {},
    originalSettings: {},
    defaultSettings: {},
    setApplyOverrides: () => {},
    fields: [],
    kibana: {
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
          DOC_LINK_VERSION: 'jest-metadata-mock-branch',
        },
      },
    },
  };
}

describe('Overrides', () => {
  test('render overrides', () => {
    const props = getProps();

    const component = shallowWithIntl(<Overrides {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('render overrides and trigger a state change', () => {
    const FORMAT_1 = 'delimited';
    const FORMAT_2 = 'ndjson';

    const props = getProps();
    props.overrides.format = FORMAT_1;

    const component = mountWithIntl(<Overrides {...props} />);

    expect(component.state('overrides').format).toEqual(FORMAT_1);

    component.instance().onFormatChange([{ label: FORMAT_2 }]);

    expect(component.state('overrides').format).toEqual(FORMAT_2);
  });
});

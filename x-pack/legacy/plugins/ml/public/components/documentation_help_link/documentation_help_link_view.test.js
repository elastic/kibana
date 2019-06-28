/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { DocumentationHelpLink } from './documentation_help_link_view';

describe('DocumentationHelpLink', () => {
  const props = {
    fullUrl: 'http://fullUrl',
    label: 'Label Text'
  };

  const component = (
    <DocumentationHelpLink {...props} />
  );

  const wrapper = shallow(component);

  test('renders the link', () => {
    expect(wrapper).toMatchSnapshot();
  });
});

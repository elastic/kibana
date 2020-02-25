/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { EmptyPage } from './index';

test('renders correctly', () => {
  const EmptyComponent = shallow(
    <EmptyPage
      actionPrimaryLabel="Do Something"
      actionPrimaryUrl="my/url/from/nowwhere"
      title="My Super Title"
    />
  );
  expect(EmptyComponent).toMatchSnapshot();
});

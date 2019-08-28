/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { Breadcrumb } from './breadcrumb';
import props from './__fixtures__/breadcrumb_props.json';

test('render correctly', () => {
  const tree = renderer.create(<Breadcrumb routeParams={props.routeParams} />).toJSON();
  expect(tree).toMatchSnapshot();
});

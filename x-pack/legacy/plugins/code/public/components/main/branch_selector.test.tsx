/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { BranchSelector } from './branch_selector';
import props from './__fixtures__/branch_selector_props.json';

jest.mock(`@elastic/eui/lib/components/form/form_row/make_id`, () => () => `generated-id`);

test('render correctly', () => {
  const tree = renderer
    .create(
      <BranchSelector
        revision="master"
        tags={props.tags}
        branches={props.branches}
        getHrefFromRevision={() => ''}
      />
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { EditFilterListToolbar } from './toolbar';

describe('EditFilterListToolbar', () => {

  const onSearchChange = jest.fn(() => {});
  const addItems = jest.fn(() => {});
  const deleteSelectedItems = jest.fn(() => {});

  const requiredProps = {
    onSearchChange,
    addItems,
    deleteSelectedItems,
    canCreateFilter: true,
    canDeleteFilter: true
  };

  test('renders the toolbar with no items selected', () => {
    const props = {
      ...requiredProps,
      selectedItemCount: 0,
    };

    const component = shallowWithIntl(
      <EditFilterListToolbar {...props} />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders the toolbar with one item selected', () => {
    const props = {
      ...requiredProps,
      selectedItemCount: 1,
    };

    const component = shallowWithIntl(
      <EditFilterListToolbar {...props} />
    );

    expect(component).toMatchSnapshot();

  });

});

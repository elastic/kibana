/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EntityCell } from './entity_cell';

const defaultProps = {
  entityName: 'Test Name',
  entityValue: 'Test Value',
  filter: () => {},
  wrapText: false,
};

describe('EntityCell', () => {
  test('Icons are displayed when filter, entityName, and entityValue are defined', () => {
    const wrapper = mountWithIntl(<EntityCell {...defaultProps} />);
    const icons = wrapper.find('EuiButtonIcon');

    expect(icons.length).toBe(2);
  });

  test('Icons are not displayed when filter, entityName, or entityValue are undefined', () => {
    const propsUndefinedFilter = { ...defaultProps, filter: undefined };
    const wrapper = mountWithIntl(<EntityCell {...propsUndefinedFilter} />);
    const icons = wrapper.find('EuiButtonIcon');

    expect(icons.length).toBe(0);
  });
});

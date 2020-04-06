/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { DataOrIndexMissing } from '../data_or_index_missing';

describe('DataOrIndexMissing component', () => {
  it('renders basePath and headingMessage', () => {
    const component = shallowWithIntl(<DataOrIndexMissing headingMessage="bar" />);
    expect(component).toMatchSnapshot();
  });
});

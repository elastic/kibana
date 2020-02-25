/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { DataMissing } from '../data_missing';

describe('DataMissing component', () => {
  it('renders basePath and headingMessage', () => {
    const component = shallowWithIntl(<DataMissing headingMessage="bar" />);
    expect(component).toMatchSnapshot();
  });
});

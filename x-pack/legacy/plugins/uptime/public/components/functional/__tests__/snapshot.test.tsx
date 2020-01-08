/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Snapshot } from '../../../../common/runtime_types';
import { PresentationalComponent } from '../snapshot';

describe('Snapshot component', () => {
  const snapshot: Snapshot = {
    up: 8,
    down: 2,
    mixed: 0,
    total: 10,
  };

  it('renders without errors', () => {
    const wrapper = shallowWithIntl(<PresentationalComponent count={snapshot} loading={false} />);
    expect(wrapper).toMatchSnapshot();
  });
});

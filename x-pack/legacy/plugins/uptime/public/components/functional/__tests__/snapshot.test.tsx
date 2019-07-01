/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Snapshot as SnapshotType } from '../../../../common/graphql/types';
import { SnapshotComponent } from '../snapshot';

describe('Snapshot component', () => {
  const snapshot: SnapshotType = {
    up: 8,
    down: 2,
    total: 10,
  };

  it('renders without errors', () => {
    const wrapper = shallowWithIntl(
      <SnapshotComponent
        absoluteStartDate={1548697920000}
        absoluteEndDate={1548700920000}
        colors={{ danger: '#F050F0', mean: '#001100', range: '#FF00FF', success: '#000000' }}
        data={{ snapshot }}
        loading={false}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});

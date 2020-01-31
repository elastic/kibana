/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { LatestVersions } from './latest_versions';

describe('Latest Versions', () => {
  test('that latest active component renders normally', () => {
    const latestVersions = [{ version: '6.3.1', count: 8 }, { version: '6.3.0', count: 2 }];

    const component = shallow(<LatestVersions latestVersions={latestVersions} />);

    expect(component).toMatchSnapshot();
  });
});

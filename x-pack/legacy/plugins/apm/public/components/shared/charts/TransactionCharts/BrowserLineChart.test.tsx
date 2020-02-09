/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { BrowserLineChart } from './BrowserLineChart';
import { MockApmPluginContextWrapper } from '../../../../utils/testHelpers';

describe('BrowserLineChart', () => {
  describe('render', () => {
    it('renders', () => {
      expect(() =>
        shallow(
          <MockApmPluginContextWrapper>
            <BrowserLineChart />
          </MockApmPluginContextWrapper>
        )
      ).not.toThrowError();
    });
  });
});

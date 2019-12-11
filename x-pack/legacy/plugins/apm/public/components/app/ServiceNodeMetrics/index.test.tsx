/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ServiceNodeMetrics } from '.';
import { MockApmPluginContextWrapper } from '../../../utils/testHelpers';

describe('ServiceNodeMetrics', () => {
  describe('render', () => {
    it('renders', () => {
      expect(() =>
        shallow(
          <MockApmPluginContextWrapper>
            <ServiceNodeMetrics />
          </MockApmPluginContextWrapper>
        )
      ).not.toThrowError();
    });
  });
});

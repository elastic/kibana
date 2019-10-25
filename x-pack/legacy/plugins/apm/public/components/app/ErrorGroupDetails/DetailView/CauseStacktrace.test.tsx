/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { CauseStacktrace } from './CauseStacktrace';

describe('CauseStacktrace', () => {
  describe('render', () => {
    it('renders', () => {
      const props = { id: 'test', exception: {} };
      expect(() => shallow(<CauseStacktrace {...props} />)).not.toThrowError();
    });
  });
});

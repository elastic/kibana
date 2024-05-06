/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UserAgentSummaryItem } from './user_agent_summary_item';
import { mountWithTheme } from '../../../utils/test_helpers';

describe('UserAgentSummaryItem', () => {
  describe('render', () => {
    const props = { original: 'Other' };

    it('renders', () => {
      expect(() =>
        mountWithTheme(<UserAgentSummaryItem {...props} />)
      ).not.toThrowError();
    });

    describe('with a version', () => {
      it('shows the version', () => {
        const p = { ...props, version: '1.0' };
        const wrapper = mountWithTheme(<UserAgentSummaryItem {...p} />);

        expect(wrapper.text()).toContain('(1.0)');
      });
    });
  });
});

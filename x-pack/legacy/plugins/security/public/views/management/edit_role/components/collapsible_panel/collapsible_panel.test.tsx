/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { CollapsiblePanel } from './collapsible_panel';

test('it renders without blowing up', () => {
  const wrapper = shallowWithIntl(
    <CollapsiblePanel iconType="logoElasticsearch" title="Elasticsearch">
      <p>child</p>
    </CollapsiblePanel>
  );

  expect(wrapper).toMatchSnapshot();
});

test('it renders children by default', () => {
  const wrapper = mountWithIntl(
    <CollapsiblePanel iconType="logoElasticsearch" title="Elasticsearch">
      <p className="child">child 1</p>
      <p className="child">child 2</p>
    </CollapsiblePanel>
  );

  expect(wrapper.find(CollapsiblePanel)).toHaveLength(1);
  expect(wrapper.find('.child')).toHaveLength(2);
});

test('it hides children when the "hide" link is clicked', () => {
  const wrapper = mountWithIntl(
    <CollapsiblePanel iconType="logoElasticsearch" title="Elasticsearch">
      <p className="child">child 1</p>
      <p className="child">child 2</p>
    </CollapsiblePanel>
  );

  expect(wrapper.find(CollapsiblePanel)).toHaveLength(1);
  expect(wrapper.find('.child')).toHaveLength(2);

  wrapper.find(EuiLink).simulate('click');

  expect(wrapper.find('.child')).toHaveLength(0);
});

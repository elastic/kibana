/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('../lib/url_shortener', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import {
  ShareContextMenu,
} from './share_context_menu';

test('should render context menu panel when there are more than one panel', () => {
  const component = shallow(<ShareContextMenu
    allowEmbed
    objectType="dashboard"
    getUnhashableStates={() => {}}
  />);
  expect(component).toMatchSnapshot();
});

test('should only render permalink panel when there are no other panels', () => {
  const component = shallow(<ShareContextMenu
    allowEmbed={false}
    objectType="dashboard"
    getUnhashableStates={() => {}}
  />);
  expect(component).toMatchSnapshot();
});

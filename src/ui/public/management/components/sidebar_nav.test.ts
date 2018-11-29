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

import { sideNavItems } from '../components/sidebar_nav';

const activeProps = { visible: true, disabled: false };
const disabledProps = { visible: true, disabled: true };
const notVisibleProps = { visible: false, disabled: false };

const visibleItem = { display: 'item', id: 'item', items: [], ...activeProps };

const notVisibleSection = {
  display: 'Not visible',
  id: 'not-visible',
  items: [visibleItem],
  ...notVisibleProps,
};
const disabledSection = {
  display: 'Disabled',
  id: 'disabled',
  items: [visibleItem],
  ...disabledProps,
};
const noItemsSection = { display: 'No items', id: 'no-items', items: [], ...activeProps };
const noActiveItemsSection = {
  display: 'No active items',
  id: 'no-active-items',
  items: [
    { display: 'disabled', id: 'disabled', items: [], ...disabledProps },
    { display: 'notVisible', id: 'notVisible', items: [], ...notVisibleProps },
  ],
  ...activeProps,
};
const activeSection = {
  display: 'activeSection',
  id: 'activeSection',
  items: [visibleItem],
  ...activeProps,
};

const managementSections = [
  notVisibleSection,
  disabledSection,
  noItemsSection,
  noActiveItemsSection,
  activeSection,
];

describe('Management', () => {
  it('filters and filters and maps section objects into SidebarNav items', () => {
    expect(sideNavItems(managementSections, 'active-item-id')).toMatchSnapshot();
  });
});

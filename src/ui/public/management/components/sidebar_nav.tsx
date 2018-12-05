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

import { EuiIcon, EuiSideNav, IconType } from '@elastic/eui';
import React from 'react';
import { IndexedArray } from 'ui/indexed_array';

interface Section {
  disabled: boolean;
  visible: boolean;
  id: string;
  display: string;
  url?: string;
  icon?: IconType;
  items: IndexedArray<Section>;
}

const sectionVisible = (section: Section) => !section.disabled && section.visible;
const sectionToNav = (selectedId: string) => ({ display, id, url, icon }: Section) => ({
  id,
  name: display,
  icon: icon ? <EuiIcon type={icon} /> : null,
  isSelected: selectedId === id,
  onClick: () => url && (window.location.href = url),
  'data-test-subj': `${id}`,
});

export const sideNavItems = (sections: Section[], selectedId: string) =>
  sections
    .filter(sectionVisible)
    .filter(section => section.items.filter(sectionVisible).length)
    .map(section => ({
      items: section.items.inOrder.filter(sectionVisible).map(sectionToNav(selectedId)),
      ...sectionToNav(selectedId)(section),
    }));

export const SidebarNav = ({
  sections,
  selectedId,
}: {
  sections: Section[];
  selectedId: string;
}) => <EuiSideNav items={sideNavItems(sections, selectedId)} style={{ width: 192 }} />;

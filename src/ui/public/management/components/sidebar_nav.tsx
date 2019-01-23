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
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { IndexedArray } from 'ui/indexed_array';

interface Subsection {
  disabled: boolean;
  visible: boolean;
  id: string;
  display: string;
  url?: string;
  icon?: IconType;
}
interface Section extends Subsection {
  visibleItems: IndexedArray<Subsection>;
}

const sectionVisible = (section: Subsection) => !section.disabled && section.visible;
const sectionToNav = (selectedId: string) => ({ display, id, url, icon }: Subsection) => ({
  id,
  name: display,
  icon: icon ? <EuiIcon type={icon} /> : null,
  isSelected: selectedId === id,
  href: url,
  'data-test-subj': id,
});

export const sideNavItems = (sections: Section[], selectedId: string) =>
  sections
    .filter(sectionVisible)
    .filter(section => section.visibleItems.filter(sectionVisible).length)
    .map(section => ({
      items: section.visibleItems.filter(sectionVisible).map(sectionToNav(selectedId)),
      ...sectionToNav(selectedId)(section),
    }));

interface SidebarNavProps {
  sections: Section[];
  selectedId: string;
}

interface SidebarNavState {
  isSideNavOpenOnMobile: boolean;
}

export class SidebarNav extends React.Component<SidebarNavProps, SidebarNavState> {
  constructor(props: SidebarNavProps) {
    super(props);
    this.state = {
      isSideNavOpenOnMobile: false,
    };
  }

  public render() {
    return (
      <EuiSideNav
        mobileTitle={this.renderMobileTitle()}
        isOpenOnMobile={this.state.isSideNavOpenOnMobile}
        toggleOpenOnMobile={this.toggleOpenOnMobile}
        items={sideNavItems(this.props.sections, this.props.selectedId)}
        className="mgtSideBarNav"
      />
    );
  }

  private renderMobileTitle() {
    return <FormattedMessage id="common.ui.management.nav.menu" defaultMessage="Management menu" />;
  }

  private toggleOpenOnMobile = () => {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
  };
}

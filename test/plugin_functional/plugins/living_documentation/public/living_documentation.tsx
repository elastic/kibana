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
import React, { ReactNode } from 'react';
import { EuiSideNav, EuiPage, EuiPageSideBar } from '@elastic/eui';

import { AppMountContext } from 'kibana/public';
import { INavSection } from './i_nav_section';
import { WelcomePage } from './welcome';
import { Page } from './page';

interface Props {
  basename: string;
  context: AppMountContext;
  sections: INavSection[];
}

interface State {
  selectedItemId: string;
  selectedPageComponentLoaded: boolean;
}

interface INavItem {
  id: string;
  name: string;
  'data-test-subj': string;
  isSelected: boolean;
  onClick: () => void;
  items?: INavItem[];
}

export class LivingDocumentation extends React.Component<Props, State> {
  private selectedPageComponent?: ReactNode;
  private flattenedSections: INavSection[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedItemId: '',
      selectedPageComponentLoaded: false,
    };
    this.loadSelectedPage();
    props.sections.forEach(this.buildFlattenedSections);
  }

  buildFlattenedSections = (section: INavSection) => {
    this.flattenedSections.push({ ...section, subSections: undefined });
    if (section.subSections) {
      section.subSections.forEach(this.buildFlattenedSections);
    }
  };

  selectItem = (id: string) => {
    this.setState(
      {
        selectedItemId: id,
      },
      this.loadSelectedPage
    );
  };

  createNavItem = (section: INavSection): INavItem => {
    return {
      id: section.id,
      name: section.title,
      'data-test-subj': section.id,
      isSelected: this.state.selectedItemId === section.id,
      onClick: () => this.selectItem(section.id),
      items: section.subSections ? section.subSections.map(this.createNavItem) : [],
    };
  };

  renderSideNav() {
    const { sections } = this.props;
    const navItems = sections.map(this.createNavItem);

    return (
      <EuiSideNav
        items={[
          {
            name: 'Living documentation',
            id: 'home',
            items: [...navItems],
          },
        ]}
      />
    );
  }

  async loadSelectedPage() {
    this.setState({ selectedPageComponentLoaded: false });
    const { context } = this.props;
    const selectedSection = this.flattenedSections.find(
      section => section.id === this.state.selectedItemId
    );
    if (!selectedSection) {
      this.selectedPageComponent = <WelcomePage />;
    } else {
      const component = await selectedSection.renderComponent(context);
      this.selectedPageComponent = <Page title={selectedSection.title}>{component}</Page>;
    }

    this.setState({ selectedPageComponentLoaded: true });
  }

  render() {
    return (
      <EuiPage>
        <EuiPageSideBar>{this.renderSideNav()}</EuiPageSideBar>
        {this.selectedPageComponent}
      </EuiPage>
    );
  }
}

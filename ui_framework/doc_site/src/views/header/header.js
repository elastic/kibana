import React, {
  Component,
} from 'react';

import {
  KuiHeader,
  KuiHeaderBreadcrumb,
  KuiHeaderBreadcrumbCollapsed,
  KuiHeaderBreadcrumbs,
  KuiHeaderSection,
  KuiHeaderSectionItem,
  KuiHeaderSectionItemButton,
  KuiHeaderLogo,
  KuiIcon,
  KuiKeyPadMenu,
  KuiKeyPadMenuItem,
  KuiPopover,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isAppMenuOpen: false,
    };
  }

  onAppMenuButtonClick() {
    this.setState({
      isAppMenuOpen: !this.state.isAppMenuOpen,
    });
  }

  renderLogo() {
    return (
      <KuiHeaderLogo href="#" />
    );
  }

  renderBreadcrumbs() {
    return (
      <KuiHeaderBreadcrumbs>
        <KuiHeaderBreadcrumb href="#">
          Management
        </KuiHeaderBreadcrumb>

        <KuiHeaderBreadcrumb href="#">
          Truncation test is here
        </KuiHeaderBreadcrumb>

        <KuiHeaderBreadcrumbCollapsed />

        <KuiHeaderBreadcrumb href="#">
          Users
        </KuiHeaderBreadcrumb>

        <KuiHeaderBreadcrumb href="#" isActive>
          Create
        </KuiHeaderBreadcrumb>
      </KuiHeaderBreadcrumbs>
    );
  }

  renderSearch() {
    return (
      <KuiHeaderSectionItemButton>
        <KuiIcon type="search" />
      </KuiHeaderSectionItemButton>
    );
  }

  renderUser() {
    return (
      <KuiHeaderSectionItemButton>
        <KuiIcon type="user" />
        <span className="kuiHeader__notification">3</span>
      </KuiHeaderSectionItemButton>
    );
  }

  renderAppMenu() {
    const button = (
      <KuiHeaderSectionItemButton onClick={this.onAppMenuButtonClick.bind(this)}>
        <KuiIcon type="apps" />
      </KuiHeaderSectionItemButton>
    );

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isAppMenuOpen}
        anchorPosition="right"
      >
        <KuiKeyPadMenu>
          <KuiKeyPadMenuItem
            label="Discover"
            href="#"
          >
            <KuiIcon type="discoverApp" size="large" />
          </KuiKeyPadMenuItem>

          <KuiKeyPadMenuItem
            label="Dashboard"
            href="#"
          >
            <KuiIcon type="dashboardApp" size="large" />
          </KuiKeyPadMenuItem>

          <KuiKeyPadMenuItem
            label="Dev Tools"
            href="#"
          >
            <KuiIcon type="devToolsApp" size="large" />
          </KuiKeyPadMenuItem>

          <KuiKeyPadMenuItem
            label="Machine Learning"
            href="#"
          >
            <KuiIcon type="machineLearningApp" size="large" />
          </KuiKeyPadMenuItem>

          <KuiKeyPadMenuItem
            label="Graph"
            href="#"
          >
            <KuiIcon type="graphApp" size="large" />
          </KuiKeyPadMenuItem>

          <KuiKeyPadMenuItem
            label="Visualize"
            href="#"
          >
            <KuiIcon type="visualizeApp" size="large" />
          </KuiKeyPadMenuItem>

          <KuiKeyPadMenuItem
            label="Timelion"
            href="#"
          >
            <KuiIcon type="timelionApp" size="large" />
          </KuiKeyPadMenuItem>
        </KuiKeyPadMenu>
      </KuiPopover>
    );
  }

  render() {
    return (
      <KuiHeader>
        <KuiHeaderSection>
          <KuiHeaderSectionItem border="right">
            {this.renderLogo()}
          </KuiHeaderSectionItem>

          {this.renderBreadcrumbs()}
        </KuiHeaderSection>

        <KuiHeaderSection side="right">
          <KuiHeaderSectionItem>
            {this.renderSearch()}
          </KuiHeaderSectionItem>

          <KuiHeaderSectionItem>
            {this.renderUser()}
          </KuiHeaderSectionItem>

          <KuiHeaderSectionItem>
            {this.renderAppMenu()}
          </KuiHeaderSectionItem>
        </KuiHeaderSection>
      </KuiHeader>
    );
  }
}

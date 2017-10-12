import React, {
  Component,
} from 'react';

import {
  KuiHeaderAlert,
  KuiFlexGroup,
  KuiFlexItem,
  KuiAvatar,
  KuiHeader,
  KuiHeaderBreadcrumb,
  KuiHeaderBreadcrumbCollapsed,
  KuiHeaderBreadcrumbs,
  KuiHeaderSection,
  KuiHeaderSectionItem,
  KuiHeaderSectionItemButton,
  KuiHeaderLogo,
  KuiIcon,
  KuiLink,
  KuiText,
  KuiSpacer,
  KuiKeyPadMenu,
  KuiKeyPadMenuItem,
  KuiPopover,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isUserMenuOpen: false,
      isAppMenuOpen: false,
    };
  }

  onUserMenuButtonClick() {
    this.setState({
      isUserMenuOpen: !this.state.isUserMenuOpen,
    });
  }

  onAppMenuButtonClick() {
    this.setState({
      isAppMenuOpen: !this.state.isAppMenuOpen,
    });
  }

  closeUserMenu() {
    this.setState({
      isUserMenuOpen: false,
    });
  }

  closeAppMenu() {
    this.setState({
      isAppMenuOpen: false,
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
        <KuiIcon
          type="search"
          size="medium"
        />
      </KuiHeaderSectionItemButton>
    );
  }

  renderUserMenu() {
    const button = (
      <KuiHeaderSectionItemButton onClick={this.onUserMenuButtonClick.bind(this)}>
        <KuiIcon
          type="user"
          size="medium"
        />
        <span className="kuiHeader__notification">
          3
        </span>
      </KuiHeaderSectionItemButton>
    );

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isUserMenuOpen}
        anchorPosition="downRight"
        closePopover={this.closeUserMenu.bind(this)}
        panelClassName="kuiHeaderPopover"
      >
        <KuiFlexGroup gutterSize="medium" className="kuiHeaderProfile kui--flexRow kui--flexAlignItemsCenter">
          <KuiFlexItem grow={false}>
            <KuiAvatar name="John Username" size="xl" />
          </KuiFlexItem>
          <KuiFlexItem>
            <KuiText>
              <p>John Username</p>
            </KuiText>
            <KuiSpacer size="m" />
            <KuiFlexGroup>
              <KuiFlexItem>
                <KuiFlexGroup justifyContent="spaceBetween">
                  <KuiFlexItem grow={false}>
                    <KuiLink href="">Edit profile</KuiLink>
                  </KuiFlexItem>
                  <KuiFlexItem grow={false}>
                    <KuiLink href="">Log out</KuiLink>
                  </KuiFlexItem>
                </KuiFlexGroup>
              </KuiFlexItem>
            </KuiFlexGroup>
          </KuiFlexItem>
        </KuiFlexGroup>
        <KuiHeaderAlert
          title="Here&rsquo;s a notification title"
          text="I am the hat judge. Show me a hat and I will tell you if it&rsquo;s a good hat or bad hat."
          date="Nov. 14, 02:14PM."
        />
        <KuiHeaderAlert
          title="Here&rsquo;s a notification title that is extremely long and will wrap"
          text="I am the hat judge. Show me a hat and I will tell you if it&rsquo;s a good hat or bad hat."
          action={<KuiLink href="#">Download your thing here</KuiLink>}
          date="Nov. 14, 02:14PM."
        />
        <KuiHeaderAlert
          title="Here&rsquo;s a notification title"
          text="I am the hat judge. Show me a hat and I will tell you if it&rsquo;s a good hat or bad hat."
          action={<KuiLink href="#">Download your thing here</KuiLink>}
          date="Nov. 14, 02:14PM."
        />
      </KuiPopover>
    );
  }

  renderAppMenu() {
    const button = (
      <KuiHeaderSectionItemButton onClick={this.onAppMenuButtonClick.bind(this)}>
        <KuiIcon type="apps" size="medium" />
      </KuiHeaderSectionItemButton>
    );

    return (
      <KuiPopover
        button={button}
        isOpen={this.state.isAppMenuOpen}
        anchorPosition="downRight"
        closePopover={this.closeAppMenu.bind(this)}
        panelClassName="kuiHeaderPopover"
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
            {this.renderUserMenu()}
          </KuiHeaderSectionItem>

          <KuiHeaderSectionItem>
            {this.renderAppMenu()}
          </KuiHeaderSectionItem>
        </KuiHeaderSection>
      </KuiHeader>
    );
  }
}

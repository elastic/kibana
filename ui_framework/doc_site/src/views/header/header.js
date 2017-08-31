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
        anchorPosition="right"
        closePopover={this.closeUserMenu.bind(this)}
        panelClassName="kuiHeaderPopover"
      >
        <div className="kuiHeaderProfile kui--flexRow kui--flexAlignItemsCenter">
          <div className="kui--flexShrink1 kui--paddingRight">
            <div className="kuiAvatar kuiAvatar--large" style={{ background: `url('http://lorempixel.com/64/64/cats/')` }} />
          </div>
          <div className="kui--flexGrow1">
            <p className="kui--marginBottom">John Username</p>
            <div className="kui--flexRow">
              <div className="kui--flexGrow1">
                <a href="" className="kuiLink">Edit profile</a>
              </div>
              <div className="kui--flexGrow1 kui--textAlignRight">
                <a href="" className="kuiLink">Log out</a>
              </div>
            </div>
          </div>
        </div>
        <div className="kuiHeaderAlert">
          <svg tabIndex="0" className="kuiIcon kuiIcon--medium kuiHeaderAlert__dismiss">
            <use href="#cross" />
          </svg>
          <p className="kuiHeaderAlert__title">Here&rsquo;s a notification title</p>
          <p className="kuiHeaderAlert__text">I am the hat judge. Show me a hat and I will tell you if it&rsquo;s a good hat or bad hat.</p>
          <div className="kui--flexRow">
            <div className="kui--flexGrow1">
              <a href="" className="kuiHeaderAlert__action kuiLink">Download your thing here</a>
            </div>
            <div className="kui--flexGrow1 kuiHeaderAlert__date">
              Nov. 14, 02:14PM.
            </div>
          </div>
        </div>
        <div className="kuiHeaderAlert">
          <svg tabIndex="0" className="kuiIcon kuiIcon--medium kuiHeaderAlert__dismiss">
            <use href="#cross" />
          </svg>
          <p className="kuiHeaderAlert__title">Here&rsquo;s a really long notification title with nonsense beneath it.</p>
          <p className="kuiHeaderAlert__text">Walk the cow through a warm room, and then bring it to my plate.</p>
          <div className="kui--flexRow">
            <div className="kui--flexGrow1">
              <a href="" className="kuiHeaderAlert__action kuiLink">Download your thing here</a>
            </div>
            <div className="kui--flexGrow1 kuiHeaderAlert__date">
              Nov. 14, 02:14PM.
            </div>
          </div>
        </div>
        <div className="kuiHeaderAlert">
          <svg tabIndex="0" className="kuiIcon kuiIcon--medium kuiHeaderAlert__dismiss">
            <use href="#cross" />
          </svg>
          <p className="kuiHeaderAlert__title">Here&rsquo;s a notification title</p>
          <p className="kuiHeaderAlert__text">
            Only usable on grilled cheese sandwiches.
            That is the only application of Kraft Singles as far as I&rsquo;m concerned.
          </p>
          <div className="kui--flexRow">
            <div className="kui--flexGrow1">
              <a href="" className="kuiHeaderAlert__action kuiLink">Download your thing here</a>
            </div>
            <div className="kui--flexGrow1 kuiHeaderAlert__date">
              Nov. 14, 02:14PM.
            </div>
          </div>
        </div>
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
        anchorPosition="right"
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

import React, {
  Component,
} from 'react';

import {
  KuiFlexGroup,
  KuiFlexItem,
  KuiHeader,
  KuiHeaderBreadcrumb,
  KuiHeaderBreadcrumbs,
  KuiHeaderLogo,
  KuiHeaderSection,
  KuiHeaderSectionItem,
  KuiHeaderSectionItemButton,
  KuiIcon,
  KuiKeyPadMenu,
  KuiKeyPadMenuItem,
  KuiLink,
  KuiPage,
  KuiPageBody,
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiPageHeader,
  KuiPageHeaderSection,
  KuiPageSideBar,
  KuiPopover,
  KuiSideNav,
  KuiSideNavItem,
  KuiSideNavTitle,
  KuiSpacer,
  KuiTitle,
  KuiCallOut,
  KuiForm,
  KuiFormRow,
  KuiFieldText,
  KuiBottomBar,
  KuiButtonEmpty,
  KuiText,
  KuiTextColor,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isUserMenuOpen: false,
      isAppMenuOpen: false,
      isSideNavOpenOnMobile: false,
      showBar: false,
    };
  }

  handleFormChange() {
    this.setState({
      showBar: !this.state.showBar,
    });
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

  toggleOpenOnMobile() {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
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

        <KuiHeaderBreadcrumb href="#" isActive>
          Advanced settings
        </KuiHeaderBreadcrumb>
      </KuiHeaderBreadcrumbs>
    );
  }

  renderSearch() {
    return (
      <KuiHeaderSectionItemButton>
        <KuiIcon type="search" size="medium" />
      </KuiHeaderSectionItemButton>
    );
  }

  renderUserMenu() {
    const button = (
      <KuiHeaderSectionItemButton onClick={this.onUserMenuButtonClick.bind(this)}>
        <KuiIcon type="user" size="medium" />
        <span className="kuiHeader__notification">3</span>
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
            <div
              className="kuiAvatar kuiAvatar--large"
              style={{ background: `url('http://lorempixel.com/64/64/cats/')` }}
            />
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

  renderHeader() {
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

  renderForm() {
    return (
      <KuiForm>
        <KuiFormRow
          id="blargh1"
          label="query:queryString:options"
          helpText={
            <div>
              <span>Options for the lucene query string parser. </span>
              <KuiLink href="">
                Reset
              </KuiLink>
            </div>
          }
        >
          <KuiFieldText onChange={this.handleFormChange.bind(this)} value="analyze_wildcard: true" />
        </KuiFormRow>

        <KuiFormRow
          id="blargh2"
          label="sort:options"
          helpText="Options for the Elasticsearch sort parameter"
        >
          <KuiFieldText value="unmapped_type: boolean" />
        </KuiFormRow>

        <KuiFormRow
          id="blargh3"
          label="dateFormat"
          helpText="When displaying a pretty formatted date, use this format"
        >
          <KuiFieldText value="MMMM Do YYYY, HH:mm:ss.SSS" />
        </KuiFormRow>

        <KuiFormRow
          id="blargh3"
          label="dateFormat:tz"
          helpText="Which timezone should be used. 'Browser' will use the timezone detected by your browser."
        >
          <KuiFieldText value="Browser" />
        </KuiFormRow>

        <KuiFormRow
          id="blargh3"
          label="dateFormat:dow"
          helpText="What day should weeks start on?"
        >
          <KuiFieldText value="Sunday" />
        </KuiFormRow>

        <KuiFormRow
          id="blargh3"
          label="defaultIndex (Default: null) "
          helpText="The index to access if no index is set"
        >
          <KuiFieldText value="null" />
        </KuiFormRow>
      </KuiForm>
    );
  }
  renderSideNav() {
    return (
      <KuiPageSideBar>
        <KuiSideNav
          mobileTitle="Navigate within Management"
          toggleOpenOnMobile={this.toggleOpenOnMobile.bind(this)}
          isOpenOnMobile={this.state.isSideNavOpenOnMobile}
        >
          {/* Elasticsearch section */}

          <KuiSideNavTitle>
            Elasticsearch
          </KuiSideNavTitle>

          <KuiSideNavItem>
            <button onClick={() => window.alert('Button clicked')}>
              Data sources
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem>
            <a href="http://www.elastic.co">
              Users
            </a>
          </KuiSideNavItem>

          <KuiSideNavItem>
            <button>
              Roles
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem>
            <button>
              Watches
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem>
            <button>
              Extremely long title will become truncated when the browser is narrow enough
            </button>
          </KuiSideNavItem>

          {/* Kibana section */}

          <KuiSideNavTitle>
            Kibana
          </KuiSideNavTitle>

          <KuiSideNavItem isSelected>
            <button>
              Advanced settings
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem indent isSelected>
            <button>
              General
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem indent>
            <button>
              Notifications
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem indent>
            <button>
              Timelion
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem indent>
            <button>
              Visualizations
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem>
            <button>
              Index Patterns
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem>
            <button>
              Saved Objects
            </button>
          </KuiSideNavItem>

          <KuiSideNavItem>
            <button>
              Reporting
            </button>
          </KuiSideNavItem>

          {/* Logstash section */}

          <KuiSideNavTitle>
            Logstash
          </KuiSideNavTitle>

          <KuiSideNavItem>
            <button>
              Pipeline Viewer
            </button>
          </KuiSideNavItem>
        </KuiSideNav>
      </KuiPageSideBar>
    );
  }

  renderPage() {

    return (
      <KuiPage>
        <KuiPageHeader>
          <KuiPageHeaderSection>
            <KuiTitle size="large">
              <h1>Management</h1>
            </KuiTitle>
          </KuiPageHeaderSection>
        </KuiPageHeader>
        <KuiPageBody>
          {this.renderSideNav()}
          <KuiPageContent>
            <KuiPageContentHeader>
              <KuiPageContentHeaderSection>
                <KuiTitle>
                  <span>
                    <KuiLink href="">Advanced settings</KuiLink>
                    <span>: General</span>
                  </span>
                </KuiTitle>
              </KuiPageContentHeaderSection>
            </KuiPageContentHeader>
            <KuiPageContentBody>
              <KuiCallOut
                title="Proceed with caution!"
                type="warning"
              >
                <p>
                  Tweaks you make here can break Kibana if you do not know what you are doing.
                </p>
              </KuiCallOut>
              <KuiSpacer size="l" />
              {this.renderForm()}
            </KuiPageContentBody>
          </KuiPageContent>
        </KuiPageBody>
      </KuiPage>
    );
  }


  render() {

    let bottomBar;
    if (this.state.showBar) {
      bottomBar = (
        <KuiBottomBar>
          <KuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <KuiFlexItem grow={false}>
              <KuiText>
                <p>
                  <KuiTextColor color="ghost">
                    You have unsaved changes in your form.
                  </KuiTextColor>
                </p>
              </KuiText>
            </KuiFlexItem>
            <KuiFlexItem grow={false}>
              <KuiFlexGroup justifyContent="flexEnd" gutterSize="small">
                <KuiFlexItem grow={false}>
                  <KuiButtonEmpty type="ghost" size="small" iconType="check">Save</KuiButtonEmpty>
                </KuiFlexItem>
                <KuiFlexItem grow={false}>
                  <KuiButtonEmpty type="ghost" size="small" iconType="cross">Discard</KuiButtonEmpty>
                </KuiFlexItem>
              </KuiFlexGroup>
            </KuiFlexItem>
          </KuiFlexGroup>
        </KuiBottomBar>
      );
    }

    return (
      <div>
        {this.renderHeader()}
        {this.renderPage()}
        {bottomBar}
      </div>
    );
  }
}

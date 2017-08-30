import React, {
  cloneElement,
  Component,
} from 'react';

import {
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
  KuiHeader,
  KuiHeaderBreadcrumb,
  KuiHeaderBreadcrumbCollapsed,
  KuiHeaderBreadcrumbs,
  KuiHeaderLogo,
  KuiHeaderSection,
  KuiHeaderSectionItem,
  KuiHeaderSectionItemButton,
  KuiGlobalToastList,
  KuiGlobalToastListItem,
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
  KuiToast,
  KuiTitle,
} from '../../../../components';

import {
  Table,
} from '../../views/table/table';

const TOAST_LIFE_TIME_MS = 4000;
const TOAST_FADE_OUT_MS = 250;
let toastIdCounter = 0;
const timeoutIds = [];

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isUserMenuOpen: false,
      isAppMenuOpen: false,
      isSideNavOpenOnMobile: false,
      toasts: [],
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

  onAddToastClick() {
    const {
      toast,
      toastId,
    } = this.renderRandomToast();

    this.setState({
      toasts: this.state.toasts.concat(toast),
    });

    this.scheduleToastForDismissal(toastId);
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

  scheduleToastForDismissal(toastId, isImmediate = false) {
    const lifeTime = isImmediate ? TOAST_FADE_OUT_MS : TOAST_LIFE_TIME_MS;

    timeoutIds.push(setTimeout(() => {
      this.dismissToast(toastId);
    }, lifeTime));

    timeoutIds.push(setTimeout(() => {
      this.startDismissingToast(toastId);
    }, lifeTime - TOAST_FADE_OUT_MS));
  }

  startDismissingToast(toastId) {
    this.setState({
      toasts: this.state.toasts.map(toast => {
        if (toast.key === toastId) {
          return cloneElement(toast, {
            isDismissed: true,
          });
        }

        return toast;
      }),
    });
  }

  dismissToast(toastId) {
    this.setState({
      toasts: this.state.toasts.filter(toast => toast.key !== toastId),
    });
  }

  onDeleteAllToasts() {
    this.setState({
      toasts: [],
    });
  }

  componentWillUnmount() {
    timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
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

          <KuiSideNavItem isSelected>
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
                  <h2>Watches</h2>
                </KuiTitle>
              </KuiPageContentHeaderSection>
              <KuiPageContentHeaderSection>
                <KuiFlexGroup gutterSize="medium">
                  <KuiFlexItem>
                    <KuiButton
                      onClick={this.onAddToastClick.bind(this)}
                      size="small"
                    >
                      Add toast
                    </KuiButton>
                  </KuiFlexItem>
                  <KuiFlexItem>
                    <KuiButton
                      type="danger"
                      onClick={this.onDeleteAllToasts.bind(this)}
                      size="small"
                    >
                      Clear toasts
                    </KuiButton>
                  </KuiFlexItem>
                </KuiFlexGroup>
              </KuiPageContentHeaderSection>
            </KuiPageContentHeader>
            <KuiPageContentBody>
              <Table />
            </KuiPageContentBody>
          </KuiPageContent>
        </KuiPageBody>
      </KuiPage>
    );
  }

  renderRandomToast() {
    const toastId = (toastIdCounter++).toString();
    const dismissToast = this.scheduleToastForDismissal.bind(this, toastId, true);

    const toasts = [(
      <KuiToast
        title="Check it out, here's a really long title that will wrap within a narrower browser"
        type="info"
        onClose={dismissToast}
      >
        <p>
          Here&rsquo;s some stuff that you need to know. We can make this text really long so that,
          when viewed within a browser that&rsquo;s fairly narrow, it will wrap, too.
        </p>
        <p>
          And some other stuff on another line, just for kicks. And <KuiLink href="#">here&rsquo;s a link</KuiLink>.
        </p>
      </KuiToast>
    ), (
      <KuiToast
        title="Download complete!"
        type="success"
        onClose={dismissToast}
      >
        <p>
          Thanks for your patience!
        </p>
      </KuiToast>
    ), (
      <KuiToast
        title="Logging you out soon, due to inactivity"
        type="warning"
        iconType="user"
        onClose={dismissToast}
      >
        <p>
          This is a security measure.
        </p>
        <p>
          Please move your mouse to show that you&rsquo;re still using Kibana.
        </p>
      </KuiToast>
    ), (
      <KuiToast
        title="Oops, there was an error"
        type="danger"
        iconType="help"
        onClose={dismissToast}
      >
        <p>
          Sorry. We&rsquo;ll try not to let it happen it again.
        </p>
      </KuiToast>
    )];

    const toast = (
      <KuiGlobalToastListItem key={toastId}>
        {toasts[Math.floor(Math.random() * toasts.length)]}
      </KuiGlobalToastListItem>
    );

    return { toast, toastId };
  }

  renderToasts() {
    return (
      <KuiGlobalToastList>
        {this.state.toasts}
      </KuiGlobalToastList>
    );
  }

  render() {
    return (
      <div>
        {this.renderHeader()}
        {this.renderPage()}
        {this.renderToasts()}
      </div>
    );
  }
}

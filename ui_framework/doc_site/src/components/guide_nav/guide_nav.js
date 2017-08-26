import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Link,
} from 'react-router';

import {
  getTheme,
  applyTheme,
} from '../../services';

import {
  KuiSideNav,
  KuiSideNavItem,
  KuiSideNavTitle,
  KuiFieldSearch,
  KuiFlexGroup,
  KuiFlexItem,
  KuiTitle,
  KuiSpacer,
} from '../../../../components';

export class GuideNav extends Component {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
      theme: getTheme(),
    };

    this.onSearchChange = this.onSearchChange.bind(this);
    this.onToggleTheme = this.onToggleTheme.bind(this);
  }

  onToggleTheme() {
    if (getTheme() === 'light') {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

    this.setState({
      theme: getTheme(),
    });
  }

  onSearchChange(event) {
    this.setState({
      search: event.target.value,
    });
  }

  renderNoItems(name) {
    return (
      <p className="guideNavNoItems">
        { `No ${name} match your search` }
      </p>
    );
  }

  renderPagination() {
    let hideChromeButton;

    if (this.props.isSandbox) {
      hideChromeButton = (
        <button
          className="guideLink"
          style={{ marginRight: '10px' }}
          onClick={this.props.onHideChrome}
        >
          Hide chrome
        </button>
      );
    }

    const themeButton = (
      <button
        className="guideLink"
        style={{ marginRight: '10px' }}
        onClick={this.onToggleTheme}
      >
        {this.state.theme === 'light' ? 'Dark theme' : 'Light theme'}
      </button>
    );

    return (
      <div className="guideNavPaginationButtons">
        {hideChromeButton}
        {themeButton}
      </div>
    );
  }

  render() {

    const componentNavItems =
      this.props.components.filter(item => (
        item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1
      )).map((item, index) => {
        return (
          <KuiSideNavItem key={`componentNavItem-${index}`}>
            <Link
              className="guideNavItem__link"
              to={item.path}
              onClick={this.props.onClickNavItem}
            >
              {item.name}
            </Link>
          </KuiSideNavItem>
        );
      });

    const sandboxNavItems =
      this.props.sandboxes.filter(item => (
        item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1
      )).map((item, index) => {
        return (
          <KuiSideNavItem key={`sandboxNavItem-${index}`}>
            <Link
              className="guideNavItem__link"
              to={item.path}
              onClick={this.props.onClickNavItem}
            >
              {item.name}
            </Link>
          </KuiSideNavItem>
        );
      });

    return (
      <KuiSideNav
        mobileTitle="Navigate within $APP_NAME"
      >
        <Link
          className="guideNav__title"
          to="/"
          onClick={this.props.onClickNavItem}
        >
          <KuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <KuiFlexItem grow={false}>
              <KuiTitle><h1>KUI</h1></KuiTitle>
            </KuiFlexItem>
            <KuiFlexItem grow={false}>
              <span className="guideNav__version">{this.props.version}</span>
            </KuiFlexItem>
          </KuiFlexGroup>
        </Link>

        <KuiFieldSearch
          placeholder="Search..."
          value={this.state.search}
          onChange={this.onSearchChange}
        />

        <KuiSpacer size="m" />

        <KuiSideNavTitle>
          Components
        </KuiSideNavTitle>

        {componentNavItems}

        <KuiSideNavTitle>
          Sandboxes
        </KuiSideNavTitle>

        {sandboxNavItems}

        {this.renderPagination()}

        <button
          className="guideLink guideNav__showButton"
          onClick={this.props.onShowChrome}
        >
          Show chrome
        </button>
      </KuiSideNav>
    );
  }
}

GuideNav.propTypes = {
  isChromeVisible: PropTypes.bool,
  isSandbox: PropTypes.bool,
  onToggleNav: PropTypes.func,
  onHideChrome: PropTypes.func,
  onShowChrome: PropTypes.func,
  onClickNavItem: PropTypes.func,
  version: PropTypes.string,
  routes: PropTypes.array,
  getPreviousRoute: PropTypes.func,
  components: PropTypes.array,
  sandboxes: PropTypes.array,
};

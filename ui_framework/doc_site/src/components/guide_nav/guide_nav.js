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
  KuiIcon,
  KuiSideNavItem,
  KuiSideNavTitle,
  KuiFieldSearch,
  KuiFlexGroup,
  KuiFlexItem,
  KuiText,
  KuiSpacer,
} from '../../../../components';

export class GuideNav extends Component {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
      theme: getTheme(),
      isSideNavOpenOnMobile: false,
    };

    this.onSearchChange = this.onSearchChange.bind(this);
    this.onToggleTheme = this.onToggleTheme.bind(this);
  }

  toggleOpenOnMobile() {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
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

  render() {
    const componentNavItems =
      this.props.components.filter(item => (
        item.name.toLowerCase().indexOf(this.state.search.toLowerCase()) !== -1
      )).map((item, index) => {
        return (
          <KuiSideNavItem key={`componentNavItem-${index}`} isSelected={this.props.routes[1].name === item.name}>
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
        mobileTitle="Navigate components"
        toggleOpenOnMobile={this.toggleOpenOnMobile.bind(this)}
        isOpenOnMobile={this.state.isSideNavOpenOnMobile}
      >
        <KuiFlexGroup alignItems="center" gutterSize="small">
          <KuiFlexItem grow={false}>
            <button className="guideNav__logo" onClick={this.onToggleTheme}>
              <KuiIcon type="kibanaLogo" size="large" />
            </button>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiText size="small">
              <Link
                to="/"
                onClick={this.props.onClickNavItem}
                className="kuiLink"
              >
                {this.props.version}
              </Link>
            </KuiText>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <button
              onClick={this.props.onHideChrome}
            >
              <KuiIcon type="fullScreen" size="medium" />
            </button>
          </KuiFlexItem>
        </KuiFlexGroup>

        <KuiSpacer size="m" />

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

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  Link,
} from 'react-router';

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
      isSideNavOpenOnMobile: false,
    };

    this.onSearchChange = this.onSearchChange.bind(this);
  }

  toggleOpenOnMobile() {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
  }

  onSearchChange(event) {
    this.setState({
      search: event.target.value,
    });
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
              onClick={this.props.onShowChrome}
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
              onClick={this.props.onHideChrome}
            >
              {item.name}
            </Link>
          </KuiSideNavItem>
        );
      });

    return (
      <div>
        <KuiFlexGroup alignItems="center" gutterSize="small">
          <KuiFlexItem grow={false}>
            <Link
              to="/"
              className="guideLogo"
              onClick={this.props.onShowChrome}
            >
              <KuiIcon type="logoKibana" size="large" />
            </Link>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <KuiText size="s">
              <button
                to="/"
                onClick={this.props.onToggleTheme}
                className="kuiLink"
              >
                Theme
              </button>
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

        <KuiSideNav
          mobileTitle="Navigate components"
          toggleOpenOnMobile={this.toggleOpenOnMobile.bind(this)}
          isOpenOnMobile={this.state.isSideNavOpenOnMobile}
        >
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
      </div>
    );
  }
}

GuideNav.propTypes = {
  isChromeVisible: PropTypes.bool,
  isSandbox: PropTypes.bool,
  onToggleNav: PropTypes.func,
  onHideChrome: PropTypes.func,
  onShowChrome: PropTypes.func,
  routes: PropTypes.array,
  getPreviousRoute: PropTypes.func,
  components: PropTypes.array,
  sandboxes: PropTypes.array,
};

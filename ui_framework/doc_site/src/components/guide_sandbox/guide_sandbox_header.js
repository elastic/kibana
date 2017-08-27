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
  KuiIcon,
  KuiFlexGroup,
  KuiFlexItem,
} from '../../../../components';

export class GuideSandboxHeader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
      theme: getTheme(),
    };

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

    return (
      <div className="guideNavPaginationButtons">
        {hideChromeButton}
      </div>
    );
  }

  render() {

    return (
      <div className="guideSandbox__header">
        <KuiFlexGroup alignItems="center" gutterSize="small">
          <KuiFlexItem grow={false}>
            <button onClick={this.onToggleTheme}>
              <KuiIcon type="kibanaLogo" size="medium" />
            </button>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <Link
              to="/"
              onClick={this.props.onClickNavItem}
              className="guideSandbox__link"
            >
              {this.props.version}
            </Link>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <button
              onClick={this.props.onShowChrome}
            >
              <KuiIcon type="list" size="medium" className="guideSandbox__appListIcon" />
            </button>
          </KuiFlexItem>
        </KuiFlexGroup>
      </div>
    );
  }
}

GuideSandboxHeader.propTypes = {
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

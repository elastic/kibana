import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Link,
} from 'react-router';

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
    };

  }

  render() {

    return (
      <div className="guideSandbox__header">
        <KuiFlexGroup alignItems="center" gutterSize="small">
          <KuiFlexItem grow={false}>
            <Link
              to="/"
              onClick={this.props.onShowChrome}
            >
              <KuiIcon type="kibanaLogo" size="medium" />
            </Link>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <button
              onClick={this.props.onToggleTheme}
              className="guideSandbox__link"
            >
              Theme
            </button>
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
  routes: PropTypes.array,
  getPreviousRoute: PropTypes.func,
  components: PropTypes.array,
  sandboxes: PropTypes.array,
};

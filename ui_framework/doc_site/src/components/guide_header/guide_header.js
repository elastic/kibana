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

export class GuideHeader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      search: '',
    };
  }

  render() {
    return (
      <div className="guideHeader">
        <KuiFlexGroup alignItems="center" gutterSize="small">
          <KuiFlexItem grow={false}>
            <Link
              to="/"
              onClick={this.props.onShowChrome}
            >
              <KuiIcon type="logoKibana" size="medium" />
            </Link>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <button
              onClick={this.props.onToggleTheme}
              className="guideHeader__link"
            >
              Theme
            </button>
          </KuiFlexItem>
          <KuiFlexItem grow={false}>
            <button
              onClick={this.props.onShowChrome}
            >
              <KuiIcon type="list" size="medium" className="guideHeader__appListIcon" />
            </button>
          </KuiFlexItem>
        </KuiFlexGroup>
      </div>
    );
  }
}

GuideHeader.propTypes = {
  isChromeVisible: PropTypes.bool,
  onToggleNav: PropTypes.func,
  onHideChrome: PropTypes.func,
  onShowChrome: PropTypes.func,
  onClickNavItem: PropTypes.func,
  routes: PropTypes.array,
  getPreviousRoute: PropTypes.func,
  components: PropTypes.array,
};

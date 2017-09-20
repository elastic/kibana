import React, {
  Component,
} from 'react';

import {
  KuiSideNav,
  KuiSideNavItem,
  KuiSideNavTitle,
} from '../../../../components';

export default class extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isSideNavOpenOnMobile: false,
    };
  }

  toggleOpenOnMobile() {
    this.setState({
      isSideNavOpenOnMobile: !this.state.isSideNavOpenOnMobile,
    });
  }

  render() {
    return (
      <KuiSideNav
        mobileTitle="Navigate within $APP_NAME"
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
    );
  }
}

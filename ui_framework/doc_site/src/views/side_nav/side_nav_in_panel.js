import React, {
  Component,
} from 'react';

import {
  KuiSideNav,
  KuiSideNavItem,
  KuiSideNavTitle,
  KuiFlexGroup,
  KuiFlexItem,
  KuiText,
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
    const sideNav = (
      <KuiSideNav
        mobileTitle="Navigate my favorite comic books"
        toggleOpenOnMobile={this.toggleOpenOnMobile.bind(this)}
        isOpenOnMobile={this.state.isSideNavOpenOnMobile}
        type="inPanel"
      >
        <KuiSideNavTitle>
          My favorite comic books
        </KuiSideNavTitle>

        <KuiSideNavItem>
          <button>
            Watchmen
          </button>
        </KuiSideNavItem>

        <KuiSideNavItem>
          <button>
            Batman: The Dark Knight Returns
          </button>
        </KuiSideNavItem>

        <KuiSideNavItem isSelected>
          <button>
            Elektra: Assassin
          </button>
        </KuiSideNavItem>

        <KuiSideNavItem>
          <button>
            V for Vendetta
          </button>
        </KuiSideNavItem>

        <KuiSideNavItem>
          <button>
            Superman: Red Son
          </button>
        </KuiSideNavItem>

        <KuiSideNavItem>
          <button>
            New Mutants
          </button>
        </KuiSideNavItem>
      </KuiSideNav>
    );

    return (
      <KuiFlexGroup>
        <KuiFlexItem grow={false} style={{ width: 200 }}>
          {sideNav}
        </KuiFlexItem>
        <KuiFlexItem>
          <KuiText>
            <h2>Elektra: Assassin</h2>
            <p>
              Elektra: Assassin is an eight-issue limited series published by Epic Comics,
              an imprint of Marvel Comics, between August 1986 and March 1987. Written
              by Frank Miller and illustrated by Bill Sienkiewicz, Elektra: Assassin
              satirizes ultra-violence, politics, comic book clichés like ninjas and
              cyborgs, and the portrayal of women.
            </p>
            <p>
              Elektra: Assassin is an eight-issue limited series published by Epic Comics,
              an imprint of Marvel Comics, between August 1986 and March 1987. Written
              by Frank Miller and illustrated by Bill Sienkiewicz, Elektra: Assassin
              satirizes ultra-violence, politics, comic book clichés like ninjas and
              cyborgs, and the portrayal of women.
            </p>
            <p>
              Elektra: Assassin is an eight-issue limited series published by Epic Comics,
              an imprint of Marvel Comics, between August 1986 and March 1987. Written
              by Frank Miller and illustrated by Bill Sienkiewicz, Elektra: Assassin
              satirizes ultra-violence, politics, comic book clichés like ninjas and
              cyborgs, and the portrayal of women.
            </p>
          </KuiText>
        </KuiFlexItem>
      </KuiFlexGroup>
    );
  }
}

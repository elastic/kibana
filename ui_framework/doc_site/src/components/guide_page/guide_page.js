import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuidePageSideNav,
  GuidePageSideNavItem,
} from '../';

export class GuidePage extends Component {
  constructor(props) {
    super(props);

    this.onClickLink = this.onClickLink.bind(this);
  }

  onClickLink(id) {
    // Scroll to element.
    $('html, body').animate({ // eslint-disable-line no-undef
      scrollTop: $(`#${id}`).offset().top - 100 // eslint-disable-line no-undef
    }, 250);
  }

  renderSideNavMenu() {
    // Traverse sections and build side nav from it.
    return this.props.sections.map((section, index) => {
      return (
        <GuidePageSideNavItem
          key={index}
          id={section.id}
          onClick={this.onClickLink}
        >
          {section.name}
        </GuidePageSideNavItem>
      );
    });
  }

  render() {
    return (
      <div className="guidePage">
        <GuidePageSideNav title={this.props.title}>
          {this.renderSideNavMenu()}
        </GuidePageSideNav>

        <div className="guidePageBody">
          {this.props.children}
        </div>
      </div>
    );
  }
}

GuidePage.propTypes = {
  children: PropTypes.any,
  title: PropTypes.string,
  sections: PropTypes.array,
};

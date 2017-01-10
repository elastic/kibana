
import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Slugify,
} from '../../services';

import {
  GuidePageSideNav,
  GuidePageSideNavItem,
} from '../';

export default class GuidePage extends Component {

  constructor(props) {
    super(props);

    this.onClickLink = this.onClickLink.bind(this);
  }

  onClickLink(slug) {
    // Scroll to element.
    $('html, body').animate({
      scrollTop: $(`#${slug}`).offset().top - 100
    }, 250);

    // Load in code viewer.
    this.context.updateCodeViewer(slug);
  }

  renderSideNavMenu() {
    //  Traverse children and build side nav from it.
    return this.props.children.map((section, index) => {
      return (
        <GuidePageSideNavItem
          key={index}
          slug={Slugify.one(section.props.title)}
          onClick={this.onClickLink}
        >
          {section.props.title}
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

GuidePage.contextTypes = {
  updateCodeViewer: PropTypes.func,
};

GuidePage.propTypes = {
  children: PropTypes.any,
  title: PropTypes.string,
};

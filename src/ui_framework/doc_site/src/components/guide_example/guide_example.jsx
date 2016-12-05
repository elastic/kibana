
import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Slugify,
} from '../../services';

import {
  GuidePage,
  GuidePageSection,
} from '../';

export default class GuideExample extends Component {

  constructor(props, sections) {
    super(props);

    this.sections = sections.map(section => Object.assign({}, section, {
      slug: Slugify.one(section.title),
    }));
  }

  componentWillMount() {
    this.sections.forEach(section => {
      this.context.registerCode(section);
    });
  }

  componentWillUnmount() {
    this.sections.forEach(section => {
      this.context.unregisterCode(section);
    });
  }

  renderSections() {
    return this.sections.map((section, index) => (
      <GuidePageSection
        key={index}
        title={section.title}
        slug={section.slug}
        html={section.html}
        js={section.js}
      >
        {section.description}
      </GuidePageSection>
    ));
  }

  render() {
    return (
      <GuidePage
        title={this.props.route.name}
      >
        {this.renderSections()}
      </GuidePage>
    );
  }

}

GuideExample.contextTypes = {
  registerCode: PropTypes.func,
  unregisterCode: PropTypes.func,
};

GuideExample.propTypes = {
  route: PropTypes.object.isRequired,
  sections: PropTypes.arrayOf(React.PropTypes.shape({
    title: React.PropTypes.string.isRequired,
    description: React.PropTypes.any,
    html: React.PropTypes.string.isRequired,
    js: React.PropTypes.string,
  })),
};

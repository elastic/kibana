import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const html = require('./tabs.html');
const js = require('raw!./tabs.js');

export default class TabsExample extends Component {
  render() {
    return (
      <GuidePage title={this.props.route.name}>
       <GuideSection
          title="Tabs"
          source={[{
            type: GuideSectionTypes.HTML,
            code: html,
          }, {
            type: GuideSectionTypes.JS,
            code: js,
          }]}
        >
          <GuideText>
            Wrap any series of components, e.g. Panel, in the VerticalRhythm component to space
            them apart.
          </GuideText>

          <GuideDemo
            html={html}
            js={js}
          />
        </GuideSection>
      </GuidePage>
    );
  }
}

TabsExample.propTypes = {
  route: PropTypes.object.isRequired,
};

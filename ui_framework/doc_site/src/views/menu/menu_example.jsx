import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideCode,
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
} from '../../components';

const menuHtml = require('./menu.html');
const menuContainedHtml = require('./menu_contained.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Menu"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: menuHtml,
      }]}
    >
      <GuideDemo
        html={menuHtml}
      />
    </GuideSection>

    <GuideSection
      title="Menu, contained"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: menuContainedHtml,
      }]}
    >
      <GuideDemo
        html={menuContainedHtml}
      />
    </GuideSection>
  </GuidePage>
);

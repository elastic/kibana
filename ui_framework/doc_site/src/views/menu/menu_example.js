import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

const menuHtml = require('./menu.html');
const menuContainedHtml = require('./menu_contained.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Menu"
      source={[{
        type: GuideSectionTypes.HTML,
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
        type: GuideSectionTypes.HTML,
        code: menuContainedHtml,
      }]}
    >
      <GuideDemo
        html={menuContainedHtml}
      />
    </GuideSection>
  </GuidePage>
);

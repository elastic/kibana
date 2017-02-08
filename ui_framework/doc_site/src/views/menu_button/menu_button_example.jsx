import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideText,
} from '../../components';

const basicHtml = require('./menu_button_basic.html');
const dangerHtml = require('./menu_button_danger.html');
const withIconHtml = require('./menu_button_with_icon.html');
const groupHtml = require('./menu_button_group.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Basic MenuButton"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: basicHtml,
      }]}
    >
      <GuideDemo
        html={basicHtml}
      />
    </GuideSection>

    <GuideSection
      title="Danger MenuButton"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: dangerHtml,
      }]}
    >
      <GuideDemo
        html={dangerHtml}
      />
    </GuideSection>

    <GuideSection
      title="MenuButton with Icon"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: withIconHtml,
      }]}
    >
      <GuideText>
        You can use a MenuButton with an Icon, with or without text.
      </GuideText>

      <GuideDemo
        html={withIconHtml}
      />
    </GuideSection>

    <GuideSection
      title="MenuButtonGroup"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: groupHtml,
      }]}
    >
      <GuideDemo
        html={groupHtml}
      />
    </GuideSection>
  </GuidePage>
);

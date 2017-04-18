import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const basicHtml = require('./menu_button_basic.html');
const primaryHtml = require('./menu_button_primary.html');
const dangerHtml = require('./menu_button_danger.html');
const withIconHtml = require('./menu_button_with_icon.html');
const groupHtml = require('./menu_button_group.html');
const elementsHtml = require('./menu_button_elements.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Basic MenuButton"
      source={[{
        type: GuideSectionTypes.HTML,
        code: basicHtml,
      }]}
    >
      <GuideDemo
        html={basicHtml}
      />
    </GuideSection>

    <GuideSection
      title="Primary MenuButton"
      source={[{
        type: GuideSectionTypes.HTML,
        code: primaryHtml,
      }]}
    >
      <GuideDemo
        html={primaryHtml}
      />
    </GuideSection>

    <GuideSection
      title="Danger MenuButton"
      source={[{
        type: GuideSectionTypes.HTML,
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
        type: GuideSectionTypes.HTML,
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
        type: GuideSectionTypes.HTML,
        code: groupHtml,
      }]}
    >
      <GuideDemo
        html={groupHtml}
      />
    </GuideSection>

    <GuideSection
      title="Element variations"
      source={[{
        type: GuideSectionTypes.HTML,
        code: elementsHtml,
      }]}
    >
      <GuideText>
        You can create a MenuButton using a button element, link, or input[type="submit"].
      </GuideText>

      <GuideDemo
        html={elementsHtml}
      />
    </GuideSection>
  </GuidePage>
);

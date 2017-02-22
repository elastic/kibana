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

const basicHtml = require('./button_basic.html');
const hollowHtml = require('./button_hollow.html');
const primaryHtml = require('./button_primary.html');
const dangerHtml = require('./button_danger.html');
const withIconHtml = require('./button_with_icon.html');
const groupHtml = require('./button_group.html');
const groupUnitedHtml = require('./button_group_united.html');
const inToolBarHtml = require('./buttons_in_tool_bar.html');
const elementsHtml = require('./button_elements.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Basic Button"
      source={[{
        type: GuideSectionTypes.HTML,
        code: basicHtml,
      }]}
    >
      <GuideText>
        Use the basic Button in most situations.
      </GuideText>

      <GuideDemo
        html={basicHtml}
      />
    </GuideSection>

    <GuideSection
      title="Hollow Button"
      source={[{
        type: GuideSectionTypes.HTML,
        code: hollowHtml,
      }]}
    >
      <GuideText>
        Use the hollow Button when presenting a neutral action, e.g. a "Cancel" button.
      </GuideText>

      <GuideDemo
        html={hollowHtml}
      />
    </GuideSection>

    <GuideSection
      title="Primary Button"
      source={[{
        type: GuideSectionTypes.HTML,
        code: primaryHtml,
      }]}
    >
      <GuideText>
        Use the primary Button to represent the most common action. Generally, there won't be a
        need to present more than one of these at a time.
      </GuideText>

      <GuideDemo
        html={primaryHtml}
      />
    </GuideSection>

    <GuideSection
      title="Danger Button"
      source={[{
        type: GuideSectionTypes.HTML,
        code: dangerHtml,
      }]}
    >
      <GuideText>
        Danger Buttons represent irreversible, potentially regrettable actions.
      </GuideText>

      <GuideDemo
        html={dangerHtml}
      />
    </GuideSection>

    <GuideSection
      title="Button with icon"
      source={[{
        type: GuideSectionTypes.HTML,
        code: withIconHtml,
      }]}
    >
      <GuideText>
        You can toss an icon into a Button, with or without text.
      </GuideText>

      <GuideDemo
        html={withIconHtml}
      />
    </GuideSection>

    <GuideSection
      title="ButtonGroup"
      source={[{
        type: GuideSectionTypes.HTML,
        code: groupHtml,
      }]}
    >
      <GuideText>

      </GuideText>

      <GuideDemo
        html={groupHtml}
      />
    </GuideSection>

    <GuideSection
      title="United ButtonGroup"
      source={[{
        type: GuideSectionTypes.HTML,
        code: groupUnitedHtml,
      }]}
    >
      <GuideText>
        Use the united version of the ButtonGroup to emphasize the close relationship within a set
        of Buttons, and differentiate them from Buttons outside of the set.
      </GuideText>

      <GuideText>
        They support containing a single Button, so that Buttons can be dynamically added and
        removed.
      </GuideText>

      <GuideDemo
        html={groupUnitedHtml}
      />
    </GuideSection>

    <GuideSection
      title="In ToolBar"
      source={[{
        type: GuideSectionTypes.HTML,
        code: inToolBarHtml,
      }]}
    >
      <GuideText>
        This example verifies that Buttons are legible against the ToolBar's background.
      </GuideText>

      <GuideDemo
        html={inToolBarHtml}
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
        You can create a Button using a button element, link, or input[type="submit"].
      </GuideText>

      <GuideDemo
        html={elementsHtml}
      />
    </GuideSection>
  </GuidePage>
);

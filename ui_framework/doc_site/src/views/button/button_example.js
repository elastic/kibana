import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Button from './button';
const buttonSource = require('!!raw!./button');
const buttonHtml = renderToHtml(Button);

import ButtonWithIcon from './button_with_icon';
const buttonWithIconSource = require('!!raw!./button_with_icon');
const buttonWithIconHtml = renderToHtml(Button);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonHtml,
      }]}
    >
      <GuideText>
        Button <GuideCode>type</GuideCode> defines the color of the button.
        <GuideCode>fill</GuideCode> can be optionally added to add more focus to an action.
      </GuideText>

      <GuideDemo>
        <Button />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Button with Icon"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonWithIconSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonWithIconHtml,
      }]}
    >
      <GuideText>
        The passed icon needs to come from our list of svg icons. Can be flipped
        to the other side by passing <GuideCode>iconReverse</GuideCode>.
      </GuideText>

      <GuideDemo>
        <ButtonWithIcon />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

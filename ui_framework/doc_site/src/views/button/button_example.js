import React from 'react';

import { renderToHtml } from '../../services';

import {
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
        Description needed: how to use the Button component.
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
        Description needed: how to use the Button component.
      </GuideText>

      <GuideDemo>
        <ButtonWithIcon />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

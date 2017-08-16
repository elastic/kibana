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

import ButtonOption from './button_empty';
const buttonOptionSource = require('!!raw!./button_empty');
const buttonOptionHtml = renderToHtml(ButtonOption);

import ButtonOptionFlush from './button_empty_flush';
const buttonOptionFlushSource = require('!!raw!./button_empty_flush');
const buttonOptionFlushHtml = renderToHtml(ButtonOptionFlush);

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
        The passed icon needs to come from our list of svg icons. Can be flipped {
          // eslint-disable-next-line react/no-unescaped-entities
        } to the other side by passing <GuideCode>iconSide="right"</GuideCode>.
      </GuideText>

      <GuideDemo>
        <ButtonWithIcon />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ButtonEmpty"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonOptionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonOptionHtml,
      }]}
    >
      <GuideDemo>
        <ButtonOption />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Flush ButtonEmpty"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonOptionFlushSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonOptionFlushHtml,
      }]}
    >
      <GuideText>
        When aligning <GuideCode>KuiButtonEmpty</GuideCode> components to the left or the right,
        you should make sure they&rsquo;re flush with the edge of their container, so that they&rsquo;re
        horizontally-aligned with the other content in the container.
      </GuideText>

      <GuideDemo>
        <ButtonOptionFlush />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
} from '../../../../components';

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

import ButtonIcon from './button_icon';
const buttonIconSource = require('!!raw!./button_icon');
const buttonIconHtml = renderToHtml(ButtonIcon);

import ButtonGhost from './button_ghost';
const buttonGhostSource = require('!!raw!./button_ghost');
const buttonGhostHtml = renderToHtml(ButtonGhost);

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
      text={
        <p>
          Button <KuiCode>type</KuiCode> defines the color of the button.
          <KuiCode>fill</KuiCode> can be optionally added to add more focus to an action.
        </p>
      }
      demo={
        <Button />
      }
    />

    <GuideSection
      title="Button with Icon"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonWithIconSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonWithIconHtml,
      }]}
      text={
        <p>
          The passed icon needs to come from our list of svg icons. Can be flipped {
            // eslint-disable-next-line react/no-unescaped-entities
          } to the other side by passing <KuiCode>iconSide="right"</KuiCode>.
        </p>
      }
      demo={
        <ButtonWithIcon />
      }
    />

    <GuideSection
      title="ButtonEmpty"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonOptionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonOptionHtml,
      }]}
      text={
        <p>
          <KuiCode>KuiButtonEmpty</KuiCode> is used when you want to make
          a button look like a regular link, but still want to align it to
          the rest of the buttons.
        </p>
      }
      demo={
        <ButtonOption />
      }
    />

    <GuideSection
      title="Flush ButtonEmpty"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonOptionFlushSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonOptionFlushHtml,
      }]}
      text={
        <p>
          When aligning <KuiCode>KuiButtonEmpty</KuiCode> components to the left or the right,
          you should make sure they&rsquo;re flush with the edge of their container, so that they&rsquo;re
          horizontally-aligned with the other content in the container.
        </p>
      }
      demo={
        <ButtonOptionFlush />
      }
    />

    <GuideSection
      title="Button Icon"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonIconSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonIconHtml,
      }]}
      text={
        <p>
          Button icons are buttons that only contain an icon (no text).
        </p>
      }
      demo={
        <ButtonIcon />
      }
    />

    <GuideSection
      title="Ghost buttons for deep color backgrounds"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonGhostSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonGhostHtml,
      }]}
      text={
        <p>
          You can also pass <KuiCode>type=&apos;ghost&apos;</KuiCode> to any of the button
          styles on this page. These should be used extremely rarely, and are
          only for placing buttons on top of dark or image-based backgrounds.
          A good example of their use is in
          the <KuiCode>KuiBottomBar</KuiCode> component
        </p>
      }
      demo={
        <ButtonGhost />
      }
    />
  </GuidePage>
);

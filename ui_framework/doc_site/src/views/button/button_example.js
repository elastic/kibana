import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Basic from './button_basic';
const basicSource = require('!!raw!./button_basic');
const basicHtml = renderToHtml(Basic);

import Hollow from './button_hollow';
const hollowSource = require('!!raw!./button_hollow');
const hollowHtml = renderToHtml(Hollow);

import Primary from './button_primary';
const primarySource = require('!!raw!./button_primary');
const primaryHtml = renderToHtml(Primary);

import Danger from './button_danger';
const dangerSource = require('!!raw!./button_danger');
const dangerHtml = renderToHtml(Danger);

import Warning from './button_warning';
const warningSource = require('!!raw!./button_danger');
const warningHtml = renderToHtml(Warning);

import Loading from './button_loading';
const loadingSource = require('!!raw!./button_loading');
const loadingHtml = renderToHtml(Loading, { isLoading: true });

import WithIcon from './button_with_icon';
const withIconSource = require('!!raw!./button_with_icon');
const withIconHtml = renderToHtml(WithIcon);

import ButtonGroup from './button_group';
const buttonGroupSource = require('!!raw!./button_group');
const buttonGroupHtml = renderToHtml(ButtonGroup);

import ButtonGroupUnited from './button_group_united';
const buttonGroupUnitedSource = require('!!raw!./button_group_united');
const buttonGroupUnitedHtml = renderToHtml(ButtonGroupUnited);

import InToolBar from './buttons_in_tool_bar';
const inToolBarSource = require('!!raw!./buttons_in_tool_bar');
const inToolBarHtml = renderToHtml(InToolBar);

import Elements from './button_elements';
const elementsSource = require('!!raw!./button_elements');
const elementsHtml = renderToHtml(Elements);

const sizesHtml = require('./button_sizes.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Basic Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: basicSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: basicHtml,
      }]}
    >
      <GuideText>
        Use the basic Button in most situations.
      </GuideText>

      <GuideDemo>
        <Basic />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Basic />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Hollow Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: hollowSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: hollowHtml,
      }]}
    >
      <GuideText>
        Use the hollow Button when presenting a neutral action, e.g. a "Cancel" button.
      </GuideText>

      <GuideDemo>
        <Hollow />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Primary Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: primarySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: primaryHtml,
      }]}
    >
      <GuideText>
        Use the primary Button to represent the most common action. Generally, there won't be a
        need to present more than one of these at a time.
      </GuideText>

      <GuideDemo>
        <Primary />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Danger Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: dangerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: dangerHtml,
      }]}
    >
      <GuideText>
        Danger Buttons represent irreversible, potentially regrettable actions.
      </GuideText>

      <GuideDemo>
        <Danger />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Warning Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: warningSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: warningHtml,
      }]}
    >
      <GuideText>
        Warning Buttons represent potentially notable actions.
      </GuideText>

      <GuideDemo>
        <Warning />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Loading Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: loadingSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: loadingHtml,
      }]}
    >
      <GuideDemo>
        <Loading />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Button with icon"
      source={[{
        type: GuideSectionTypes.JS,
        code: withIconSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: withIconHtml,
      }]}
    >
      <GuideText>
        You can toss an icon into a Button, with or without text. You can also use a predefined icon
        or specify custom icon classes.
      </GuideText>

      <GuideDemo>
        <WithIcon />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ButtonGroup"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonGroupSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonGroupHtml,
      }]}
    >
      <GuideDemo>
        <ButtonGroup />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="United ButtonGroup"
      source={[{
        type: GuideSectionTypes.JS,
        code: buttonGroupUnitedSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: buttonGroupUnitedHtml,
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

      <GuideDemo>
        <ButtonGroupUnited />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="In ToolBar"
      source={[{
        type: GuideSectionTypes.JS,
        code: inToolBarSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: inToolBarHtml,
      }]}
    >
      <GuideText>
        This example verifies that Buttons are legible against the ToolBar's background.
      </GuideText>

      <GuideDemo>
        <InToolBar />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Element variations"
      source={[{
        type: GuideSectionTypes.JS,
        code: elementsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: elementsHtml,
      }]}
    >
      <GuideText>
        You can create a Button using a button element, link, or input[type="submit"].
      </GuideText>

      <GuideDemo>
        <Elements />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Sizes"
      source={[{
        type: GuideSectionTypes.HTML,
        code: sizesHtml,
      }]}
    >
      <GuideDemo
        html={sizesHtml}
      />
    </GuideSection>
  </GuidePage>
);

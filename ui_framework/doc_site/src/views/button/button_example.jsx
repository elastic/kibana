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

import Basic from './button_basic';
const basicSource = require('!!raw!./button_basic');

import Hollow from './button_hollow';
const hollowSource = require('!!raw!./button_hollow');

import Primary from './button_primary';
const primarySource = require('!!raw!./button_primary');

import Danger from './button_danger';
const dangerSource = require('!!raw!./button_danger');

import WithIcon from './button_with_icon';
const withIconSource = require('!!raw!./button_with_icon');

import ButtonGroup from './button_group';
const buttonGroupSource = require('!!raw!./button_group');

import ButtonGroupUnited from './button_group_united';
const buttonGroupUnitedSource = require('!!raw!./button_group_united');

import InToolBar from './buttons_in_tool_bar';
const inToolBarSource = require('!!raw!./buttons_in_tool_bar');

import Elements from './button_elements';
const elementsSource = require('!!raw!./button_elements');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Basic Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: basicSource,
      }]}
    >
      <GuideText>
        Use the basic Button in most situations.
      </GuideText>

      <GuideDemo>
        <Basic />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Hollow Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: hollowSource,
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
      title="Button with icon"
      source={[{
        type: GuideSectionTypes.JS,
        code: withIconSource,
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
      }]}
    >
      <GuideText>
        You can create a Button using a button element, link, or input[type="submit"].
      </GuideText>

      <GuideDemo>
        <Elements />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

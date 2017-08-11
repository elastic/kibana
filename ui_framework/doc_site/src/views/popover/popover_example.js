import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Popover from './popover';
const popoverSource = require('!!raw!./popover');
const popoverHtml = renderToHtml(Popover);

import PopoverAnchorPosition from './popover_anchor_position';
const popoverAnchorPositionSource = require('!!raw!./popover_anchor_position');
const popoverAnchorPositionHtml = renderToHtml(PopoverAnchorPosition);

import PopoverBodyClassName from './popover_body_class_name';
const popoverBodyClassNameSource = require('!!raw!./popover_body_class_name');
const popoverBodyClassNameHtml = renderToHtml(PopoverBodyClassName);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Popover"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverHtml,
      }]}
    >
      <GuideText>
        Use the Popover component to hide controls or options behind a clickable element.
      </GuideText>

      <GuideDemo>
        <Popover />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Anchor position"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverAnchorPositionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverAnchorPositionHtml,
      }]}
    >
      <GuideDemo>
        <PopoverAnchorPosition />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Body class name"
      source={[{
        type: GuideSectionTypes.JS,
        code: popoverBodyClassNameSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: popoverBodyClassNameHtml,
      }]}
    >
      <GuideDemo>
        <PopoverBodyClassName />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

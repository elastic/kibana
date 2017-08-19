import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import FlexGroup from './flex_group';
const flexGroupSource = require('!!raw!./flex_group');
const flexGroupHtml = renderToHtml(FlexGroup);

import FlexItems from './flex_items';
const flexItemsSource = require('!!raw!./flex_items');
const flexItemsHtml = renderToHtml(FlexItems);

import FlexGutter from './flex_gutter';
const flexGutterSource = require('!!raw!./flex_gutter');
const flexGutterHtml = renderToHtml(FlexGutter);

import FlexGrow from './flex_grow';
const flexGrowSource = require('!!raw!./flex_grow');
const flexGrowHtml = renderToHtml(FlexGrow);

import FlexJustify from './flex_justify';
const flexJustifySource = require('!!raw!./flex_justify');
const flexJustifyHtml = renderToHtml(FlexJustify);

import FlexWrap from './flex_wrap';
const flexWrapSource = require('!!raw!./flex_wrap');
const flexWrapHtml = renderToHtml(FlexWrap);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Flex Group"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGroupSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGroupHtml,
      }]}
    >
      <GuideText>
        Flex groups are useful for setting up layouts for a <strong>single row</strong> of
        content. By default flex group items will stretch and grow to match their siblings.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightGrid"><FlexGroup /></div>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Add as many items as you need"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexItemsHtml,
      }]}
    >
      <GuideText>
        Same code as above, but this one has more items inside.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightGrid"><FlexItems /></div>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Gutter sizing"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGutterSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGutterHtml,
      }]}
    >
      <GuideText>
        Flex gutters can be configured or even removed.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightGrid"><FlexGutter /></div>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Turn off growing items"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGrowSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGrowHtml,
      }]}
    >
      <GuideText>
        You can disable the growth of items if you need, but they are on by default.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightGrid"><FlexGrow /></div>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Justify items"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexJustifySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexJustifyHtml,
      }]}
    >
      <GuideText>
        Items can also be jusitified using flex box rules. Most commonly you'd do
        something like this, where you turn off growing items, and separate them
        to the corners.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightGrid"><FlexJustify /></div>
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Wrapping grids"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexWrapSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexWrapHtml,
      }]}
    >
      <GuideText>
        Grids with proper spacing can be easy set by using the wrapGridOf prop,
        passing the number of columns you want per row, up to 4.
      </GuideText>

      <GuideDemo>
        <div className="guideDemo__highlightGridWrap"><FlexWrap /></div>
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

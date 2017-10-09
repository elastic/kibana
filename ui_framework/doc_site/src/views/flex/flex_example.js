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

import FlexGrid from './flex_grid';
const flexGridSource = require('!!raw!./flex_grid');
const flexGridHtml = renderToHtml(FlexGrid);

import FlexGridColumns from './flex_grid_columns';
const flexGridColumnsSource = require('!!raw!./flex_grid_columns');
const flexGridColumnsHtml = renderToHtml(FlexGridColumns);

import FlexNest from './flex_nest';
const flexNestSource = require('!!raw!./flex_nest');
const flexNestHtml = renderToHtml(FlexNest);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="FlexGroup is for a single row layout"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGroupSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGroupHtml,
      }]}
    >
      <GuideText>
        <GuideCode>FlexGroup</GuideCode> is useful for setting up layouts for a <strong>single row</strong> of
        content. By default any <GuideCode>FlexItem</GuideCode> within <GuideCode>FlexGroup</GuideCode> will
        stretch and grow to match their siblings.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGrid"><FlexGroup /></GuideDemo>
    </GuideSection>

    <GuideSection
      title="FlexGroup accepts infinite items"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexItemsHtml,
      }]}
    >
      <GuideText>
        Same code as above. Notice that <GuideCode>FlexItem</GuideCode> creates equal width items
        no matter the number of siblings. <GuideCode>FlexGroup</GuideCode> never wraps.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGrid"><FlexItems /></GuideDemo>
    </GuideSection>

    <GuideSection
      title="FlexItem can individually turn off stretching"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGrowSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGrowHtml,
      }]}
    >
      <GuideText>
        Sometimes you do not want a <GuideCode>FlexItem</GuideCode> to grow. It
        can be turned off on each item individually.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGrid"><FlexGrow /></GuideDemo>
    </GuideSection>

    <GuideSection
      title="FlexGroup can justify and align"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexJustifySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexJustifyHtml,
      }]}
    >
      <GuideText>
        <GuideCode>FlexGroup</GuideCode>s can also
        use <GuideCode>justifyContent</GuideCode> and <GuideCode>alignItems</GuideCode>props
        that accept normal flex-box paramenters. Below are some common scenarios,
        where you need to separate two items, center justify a single one, or
        center an item vertically. Note the usage
        of <GuideCode>FlexItem</GuideCode>s with <GuideCode>grow=false</GuideCode> so that they do not stretch.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGrid"><FlexJustify /></GuideDemo>
    </GuideSection>

    <GuideSection
      title="FlexGrids are for repeatable grids"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGridSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGridHtml,
      }]}
    >
      <GuideText>
        <GuideCode>FlexGrid</GuideCode> is a more rigid component that sets multiple, wrapping
        rows of same width items.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGridWrap"><FlexGrid /></GuideDemo>
    </GuideSection>

    <GuideSection
      title="FlexGrids can have set column widths"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGridColumnsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGridColumnsHtml,
      }]}
    >
      <GuideText>
        You can set a <GuideCode>columns</GuideCode> prop to specify
        anywhere between 2-4 columns. Any more would likely break on laptop screens.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGridWrap"><FlexGridColumns /></GuideDemo>
    </GuideSection>

    <GuideSection
      title="FlexGrids and FlexGroups can nest"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexNestSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexNestHtml,
      }]}
    >
      <GuideText>
        <GuideCode>FlexGroup</GuideCode> and <GuideCode>FlexGrid</GuideCode> can nest
        within themselves indefinitely. For example, here we turn off the growth on a
        <GuideCode>FlexGroup</GuideCode>, then nest a grid inside of it.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGrid"><FlexNest /></GuideDemo>
    </GuideSection>

    <GuideSection
      title="Gutter sizing can be used on either FlexGroups or FlexGrids"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGutterSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGutterHtml,
      }]}
    >
      <GuideText>
        The <GuideCode>gutterSize</GuideCode> prop can be applied to either a
        <GuideCode>FlexGroup</GuideCode> or a <GuideCode>FlexGrid</GuideCode> to adjust the
        spacing between <GuideCode>FlexItem</GuideCode>s.
      </GuideText>

      <GuideDemo className="guideDemo__highlightGrid"><FlexGutter /></GuideDemo>
    </GuideSection>
  </GuidePage>
);

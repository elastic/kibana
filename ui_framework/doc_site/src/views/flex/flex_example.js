import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCallOut,
  KuiSpacer,
} from '../../../../components';

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

import FlexNest from './flex_nest';
const flexNestSource = require('!!raw!./flex_nest');
const flexNestHtml = renderToHtml(FlexNest);

export default props => (
  <GuidePage title={props.route.name}>
    <KuiCallOut
      title="Coloring and padding exist for examples only"
      type="warning"
    >
      <p>
        Padding and background-color are added to all the <GuideCode>FlexItem</GuideCode> components on this
        documentation page for illustrative purposes only. You will need to add padding through additional
        components or classes if you need it.
      </p>
    </KuiCallOut>

    <KuiSpacer size="l" />

    <GuideSection
      title="FlexGroup is for a single row layout"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGroupSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGroupHtml,
      }]}
      text={
        <p>
          <GuideCode>FlexGroup</GuideCode> is useful for setting up layouts for a <strong>single row</strong> of
          content. By default any <GuideCode>FlexItem</GuideCode> within <GuideCode>FlexGroup</GuideCode> will
          stretch and grow to match their siblings.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexGroup /></div>
      }
    />


    <GuideSection
      title="FlexGroup accepts infinite items"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexItemsHtml,
      }]}
      text={
        <p>
          Same code as above. Notice that <GuideCode>FlexItem</GuideCode> creates equal width items
          no matter the number of siblings. <GuideCode>FlexGroup</GuideCode> never wraps.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexItems /></div>
      }
    />

    <GuideSection
      title="FlexGroup can turn off stretching"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGrowSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGrowHtml,
      }]}
      text={
        <p>
          Sometimes you do not want a <GuideCode>FlexItem</GuideCode> to grow. It
          can be turned off on each item individually.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexGrow /></div>
      }
    />

    <GuideSection
      title="FlexGroup can be justified"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexJustifySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexJustifyHtml,
      }]}
      text={
        <p>
          <GuideCode>FlexGroup</GuideCode>s can also use a <GuideCode>justifyContent</GuideCode> prop
          that accepts normal flex-box paramenters.  Below are two common scenarios, where you need to
          separate two items, or center align a single one.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexJustify /></div>
      }
    />


    <GuideSection
      title="FlexGrids are for repeatable grids"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexWrapSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexWrapHtml,
      }]}
      text={
        <p>
          <GuideCode>FlexGrid</GuideCode> is a more rigid component that sets multiple, wrapping
          rows of same width items. It only accpets a <GuideCode>columns</GuideCode> and
          <GuideCode>gutterSize</GuideCode> prop. You can have anywhere between 2-4 columns. Any
          more would likely break on laptop screens.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGridWrap"><FlexWrap /></div>
      }
    />

    <GuideSection
      title="FlexGrids and FlexGroups can nest"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexNestSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexNestHtml,
      }]}
      text={
        <p>
          <GuideCode>FlexGroup</GuideCode> and <GuideCode>FlexGrid</GuideCode> can nest
          within themselves indefinitely. For example, here we turn off the growth on a
          <GuideCode>FlexGroup</GuideCode>, then nest a grid inside of it.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexNest /></div>
      }
    />

    <GuideSection
      title="Gutter sizing can be used on either FlexGroups or FlexGrids"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGutterSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGutterHtml,
      }]}
      text={
        <p>
          The <GuideCode>gutterSize</GuideCode> prop can be applied to either a
          <GuideCode>FlexGroup</GuideCode> or a <GuideCode>FlexGrid</GuideCode> to adjust the
          spacing between <GuideCode>FlexItem</GuideCode>s.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexGutter /></div>
      }
    />

  </GuidePage>
);

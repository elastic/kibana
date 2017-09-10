import React from 'react';

import { renderToHtml } from '../../services';

import { Link } from 'react-router';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCallOut,
  KuiSpacer,
  KuiCode,
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

import FlexItemPanel from './flex_item_panel';
const flexItemPanelSource = require('!!raw!./flex_item_panel');
const flexItemPanelHtml = renderToHtml(FlexItemPanel);

export default props => (
  <GuidePage title={props.route.name}>
    <KuiCallOut
      title="Coloring and padding exist for examples only"
      type="warning"
    >
      <p>
        Padding and background-color are added to all the <KuiCode>FlexItem</KuiCode> components on this
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
          <KuiCode>FlexGroup</KuiCode> is useful for setting up layouts for a <strong>single row</strong> of
          content. By default any <KuiCode>FlexItem</KuiCode> within <KuiCode>FlexGroup</KuiCode> will
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
          Same code as above. Notice that <KuiCode>FlexItem</KuiCode> creates equal width items
          no matter the number of siblings. <KuiCode>FlexGroup</KuiCode> never wraps.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexItems /></div>
      }
    />

    <GuideSection
      title="FlexItemPanel can substitute for any FlexItem"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexItemPanelSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexItemPanelHtml,
      }]}
      text={
        <p>
          <KuiCode>FlexItemPanel</KuiCode> can be used in place of or along-side <KuiCode>FlexItem</KuiCode>.
          It acts just like a <KuiCode>FlexItem</KuiCode> but takes on the styling and props
          of the <Link to="/panel">Panel</Link> component as well.
          You normally would use it anytime you need your panels to grow in height.
        </p>
     }
      demo={
        <FlexItemPanel />
     }
    />

    <GuideSection
      title="FlexItem / FlexItemPanel can individually turn off stretching"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexGrowSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexGrowHtml,
      }]}
      text={
        <p>
          Sometimes you do not want a <KuiCode>FlexItem</KuiCode> to grow. It
          can be turned off on each item individually.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexGrow /></div>
      }
    />

    <GuideSection
      title="FlexGroup can justify and align"
      source={[{
        type: GuideSectionTypes.JS,
        code: flexJustifySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: flexJustifyHtml,
      }]}
      text={
        <p>
          <KuiCode>FlexGroup</KuiCode>s can also
          use <KuiCode>justifyContent</KuiCode> and <KuiCode>alignItems</KuiCode>props
          that accept normal flex-box paramenters. Below are some common scenarios,
          where you need to separate two items, center justify a single one, or
          center an item vertically. Note the usage
          of <KuiCode>FlexItem</KuiCode>s with <KuiCode>grow=false</KuiCode> so that they do not stretch.
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
          <KuiCode>FlexGrid</KuiCode> is a more rigid component that sets multiple, wrapping
          rows of same width items. It only accpets a <KuiCode>columns</KuiCode> and
          <KuiCode>gutterSize</KuiCode> prop. You can have anywhere between 2-4 columns. Any
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
          <KuiCode>FlexGroup</KuiCode> and <KuiCode>FlexGrid</KuiCode> can nest
          within themselves indefinitely. For example, here we turn off the growth on a
          <KuiCode>FlexGroup</KuiCode>, then nest a grid inside of it.
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
          The <KuiCode>gutterSize</KuiCode> prop can be applied to either a
          <KuiCode>FlexGroup</KuiCode> or a <KuiCode>FlexGrid</KuiCode> to adjust the
          spacing between <KuiCode>FlexItem</KuiCode>s.
        </p>
      }
      demo={
        <div className="guideDemo__highlightGrid"><FlexGutter /></div>
      }
    />

  </GuidePage>
);

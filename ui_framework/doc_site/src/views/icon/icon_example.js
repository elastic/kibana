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

import Icons from './icons';
const iconsSource = require('!!raw!./icons');
const iconsHtml = renderToHtml(Icons);

import Apps from './apps';
const appsSource = require('!!raw!./apps');
const appsHtml = renderToHtml(Apps);

import Logos from './logos';
const logosSource = require('!!raw!./logos');
const logosHtml = renderToHtml(Logos);

import IconSizes from './icon_sizes';
const iconSizesSource = require('!!raw!./icon_sizes');
const iconSizesHtml = renderToHtml(IconSizes);

import Accessibility from './accessibility';
const accessibilitySource = require('!!raw!./accessibility');
const accessibilityHtml = renderToHtml(Accessibility);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Icons"
      source={[{
        type: GuideSectionTypes.JS,
        code: iconsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: iconsHtml,
      }]}
      text={
        <div>
          <p>
            <KuiCode>KuiIcon</KuiCode> can build out an icon from our SVG
            icon library. Icons can be resized and recolored (through a
            CSS <KuiCode>Fill</KuiCode>) decleration.
          </p>
          <p>
            New icons should be placed in
            the <KuiCode>/icons/assets/</KuiCode> folder on
            a <KuiCode>16x16</KuiCode> empty canvas.
            Icons in the general set should be monochromatic and the code
            itself <strong>should not contain any fill attributes</strong>. Use the SVGO plugin
            for Sketch when exporting to compress / clean your SVG of junk.
          </p>
          <p>
            Note: <KuiCode>guideDemo__icon</KuiCode> styling is applied on the
            below grid for documentation presentation only. Do not copy
            this class into production.
          </p>
        </div>
      }
      demo={
        <Icons />
      }
    />

    <GuideSection
      title="Apps"
      source={[{
        type: GuideSectionTypes.JS,
        code: appsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: appsHtml,
      }]}
      text={
        <p>
          App logos are usually displayed at <KuiCode>32x32</KuiCode> or above
          and can contain multiple colors.
        </p>
      }
      demo={
        <Apps />
      }
    />

    <GuideSection
      title="Logos"
      source={[{
        type: GuideSectionTypes.JS,
        code: logosSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: logosHtml,
      }]}
      text={
        <p>
          Product logos follow similar rules as app logos.
        </p>
      }
      demo={
        <Logos />
      }
    />

    <GuideSection
      title="Sizes"
      source={[{
        type: GuideSectionTypes.JS,
        code: iconSizesSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: iconSizesHtml,
      }]}
      text={
        <p>
          Use the <KuiCode>size</KuiCode> prop to automatically size your icons.
          Medium is the default, and will output a <KuiCode>16x16</KuiCode> icons.
        </p>
      }
      demo={
        <IconSizes />
      }
    />

    <GuideSection
      title="Accessibility"
      source={[{
        type: GuideSectionTypes.JS,
        code: accessibilitySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accessibilityHtml,
      }]}
      text={
        <p>
          By default, this component will use a human-readable version of the <KuiCode>type</KuiCode>
          to title the SVG. You can specify a <KuiCode>title</KuiCode> prop to override this.
        </p>
      }
      demo={
        <Accessibility />
      }
    />
  </GuidePage>
);

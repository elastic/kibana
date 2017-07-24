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
    >
      <GuideDemo>
        <Icons />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="App icons"
      source={[{
        type: GuideSectionTypes.JS,
        code: appsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: appsHtml,
      }]}
    >
      <GuideDemo>
        <Apps />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Logos"
      source={[{
        type: GuideSectionTypes.JS,
        code: logosSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: logosHtml,
      }]}
    >
      <GuideDemo>
        <Logos />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Sizes"
      source={[{
        type: GuideSectionTypes.JS,
        code: iconSizesSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: iconSizesHtml,
      }]}
    >
      <GuideDemo>
        <IconSizes />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Accessibility"
      source={[{
        type: GuideSectionTypes.JS,
        code: accessibilitySource,
      }, {
        type: GuideSectionTypes.HTML,
        code: accessibilityHtml,
      }]}
    >
      <GuideText>
        By default, this component will use a human-readable version of the <GuideCode>type</GuideCode>
        to title the SVG. You can specify a <GuideCode>title</GuideCode> prop to override this.
      </GuideText>

      <GuideDemo>
        <Accessibility />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

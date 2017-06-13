import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const html = require('./tabs.html');
const js = require('raw!./tabs.js');

import TabsCompact from './tabs_compact';
const tabsCompactSource = require('!!raw!./tabs_compact');
const tabsCompactHtml = renderToHtml(TabsCompact);

import TabsExplicit from './tabs_explicit';
const tabsExplicitSource = require('!!raw!./tabs_explicit');
const tabsExplicitHtml = renderToHtml(TabsExplicit);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Tabs"
      source={[{
        type: GuideSectionTypes.HTML,
        code: html,
      }, {
        type: GuideSectionTypes.JS,
        code: js,
      }]}
    >
      <GuideText>
        Wrap any series of components, e.g. Panel, in the VerticalRhythm component to space
        them apart.
      </GuideText>

      <GuideDemo
        html={html}
        js={js}
      />
    </GuideSection>

    <GuideSection
      title="Tabs"
      source={[{
        type: GuideSectionTypes.JS,
        code: tabsExplicitSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: tabsExplicitHtml,
      }]}
    >
      <GuideText>
        Tabs with individual tab components.
        Wrap any series of components, e.g. Panel, in the VerticalRhythm component to space
        them apart.
      </GuideText>

      <GuideDemo>
        <TabsExplicit />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Compact Tabs"
      source={[{
        type: GuideSectionTypes.JS,
        code: tabsCompactSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: tabsCompactHtml,
      }]}
    >
      <GuideText>
        Tabs defined only by theirs texts.
        Wrap any series of components, e.g. Panel, in the VerticalRhythm component to space
        them apart.
      </GuideText>

      <GuideDemo>
        <TabsCompact />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

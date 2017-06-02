import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import { ToolBarPager } from './tool_bar_pager';
const toolBarPagerSource = require('!!raw!./tool_bar_pager');
const toolBarPagerHtml = renderToHtml(ToolBarPager);

import { PagerButtons } from './pager_buttons';
const pagerButtonsSource = require('!!raw!./pager_buttons');
const pagerButtonsHtml = renderToHtml(PagerButtons);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Pager"
      source={[{
        type: GuideSectionTypes.JS,
        code: toolBarPagerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: toolBarPagerHtml,
      }]}
    >
      <GuideText>
        Use the Pager in a tool bar.
      </GuideText>

      <GuideDemo>
        <ToolBarPager />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pager Buttons"
      source={[{
        type: GuideSectionTypes.JS,
        code: pagerButtonsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: pagerButtonsHtml,
      }]}
    >
      <GuideText>
        Use the Pager Buttons to navigate through a set of items.
      </GuideText>

      <GuideDemo>
        <PagerButtons />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

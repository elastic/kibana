import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import ActionItem from './action_item';
const actionItemSource = require('!!raw-loader!./action_item');
const actionItemHtml = renderToHtml(ActionItem);

import ActionItemInMenu from './action_items_in_menu';
const actionItemInMenuSource = require('!!raw-loader!./action_items_in_menu');
const actionItemInMenuHtml = renderToHtml(ActionItemInMenu);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ActionItem"
      source={[{
        type: GuideSectionTypes.JS,
        code: actionItemSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: actionItemHtml,
      }]}
    >
      <GuideText>
        Events can represent updates, logs, notifications, and status changes.
      </GuideText>

      <GuideDemo>
        <ActionItem />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ActionItems in Menu"
      source={[{
        type: GuideSectionTypes.JS,
        code: actionItemInMenuSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: actionItemInMenuHtml,
      }]}
    >
      <GuideText>
        You&rsquo;ll typically want to present them within a Menu.
      </GuideText>

      <GuideDemo>
        <ActionItemInMenu />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

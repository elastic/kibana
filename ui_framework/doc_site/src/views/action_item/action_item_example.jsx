import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideCode,
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideText,
} from '../../components';

const actionItemHtml = require('./action_item.html');
const inMenuHtml = require('./action_items_in_menu.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ActionItem"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: actionItemHtml,
      }]}
    >
      <GuideText>
        Events can represent updates, logs, notifications, and status changes.
      </GuideText>

      <GuideDemo
        html={actionItemHtml}
      />
    </GuideSection>

    <GuideSection
      title="ActionItems in Menu"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: inMenuHtml,
      }]}
    >
      <GuideText>
        You&rsquo;ll typically want to present them within a Menu.
      </GuideText>

      <GuideDemo
        html={inMenuHtml}
      />
    </GuideSection>
  </GuidePage>
);

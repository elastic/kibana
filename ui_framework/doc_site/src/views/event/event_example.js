import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const eventHtml = require('./event.html');
const eventMenuHtml = require('./event_menu.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Event"
      source={[{
        type: GuideSectionTypes.HTML,
        code: eventHtml,
      }]}
    >
      <GuideText>
        Events can represent updates, logs, notifications, and status changes.
      </GuideText>

      <GuideDemo
        html={eventHtml}
      />
    </GuideSection>

    <GuideSection
      title="Event Menu"
      source={[{
        type: GuideSectionTypes.HTML,
        code: eventMenuHtml,
      }]}
    >
      <GuideText>
        You&rsquo;ll typically want to present them within a Menu.
      </GuideText>

      <GuideDemo
        html={eventMenuHtml}
      />
    </GuideSection>
  </GuidePage>
);

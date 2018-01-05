import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Event from './event';
const eventSource = require('!!raw-loader!./event');
const eventHtml = renderToHtml(Event);

import EventMenu from './event_menu';
const eventMenuSource = require('!!raw-loader!./event_menu');
const eventMenuHtml = renderToHtml(EventMenu);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Event"
      source={[{
        type: GuideSectionTypes.JS,
        code: eventSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: eventHtml,
      }]}
    >
      <GuideText>
        Events can represent updates, logs, notifications, and status changes.
      </GuideText>

      <GuideDemo>
        <Event />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Event Menu"
      source={[{
        type: GuideSectionTypes.JS,
        code: eventMenuSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: eventMenuHtml,
      }]}
    >
      <GuideText>
        You&rsquo;ll typically want to present them within a Menu.
      </GuideText>

      <GuideDemo>
        <EventMenu />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Badge from './badge';
const badgeSource = require('!!raw!./badge');
const badgeHtml = renderToHtml(Badge);

import BadgeWithIcon from './badge_with_icon';
const badgeWithIconSource = require('!!raw!./badge_with_icon');
const badgeWithIconHtml = renderToHtml(BadgeWithIcon);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Badge"
      source={[{
        type: GuideSectionTypes.JS,
        code: badgeSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: badgeHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the Badge component.
      </GuideText>

      <GuideDemo>
        <Badge />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Badge with Icon"
      source={[{
        type: GuideSectionTypes.JS,
        code: badgeWithIconSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: badgeWithIconHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the Badge component.
      </GuideText>

      <GuideDemo>
        <BadgeWithIcon />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

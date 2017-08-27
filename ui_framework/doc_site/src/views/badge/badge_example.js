import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
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
      text={
        <p>
          Badges are used to focus on important bits of information.
        </p>
      }
      demo={
        <Badge />
      }
    />

    <GuideSection
      title="Badge with Icon"
      source={[{
        type: GuideSectionTypes.JS,
        code: badgeWithIconSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: badgeWithIconHtml,
      }]}
      text={
        <p>
          Badges can use icons on the left and right (default) sides.
        </p>
      }
      demo={
        <BadgeWithIcon />
      }
    />
  </GuidePage>
);

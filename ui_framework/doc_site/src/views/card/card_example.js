import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Card from './card';
const cardSource = require('!!raw-loader!./card');
const cardHtml = renderToHtml(Card);

import CardGroup from './card_group';
const cardGroupSource = require('!!raw-loader!./card_group');
const cardGroupHtml = renderToHtml(CardGroup);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Card"
      source={[{
        type: GuideSectionTypes.JS,
        code: cardSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: cardHtml,
      }]}
    >
      <GuideText>
        Cards expand to fill their container. To restrict a card&rsquo;s width, define the width of its
        container.
      </GuideText>

      <GuideDemo>
        <Card />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="CardGroup"
      source={[{
        type: GuideSectionTypes.JS,
        code: cardGroupSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: cardGroupHtml,
      }]}
    >
      <GuideDemo>
        <CardGroup />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

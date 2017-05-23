import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const cardHtml = require('./card.html');
const cardGroupHtml = require('./card_group.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Card"
      source={[{
        type: GuideSectionTypes.HTML,
        code: cardHtml,
      }]}
    >
      <GuideText>
        Cards expand to fill their container. To restrict a card's width, define the width of its
        container.
      </GuideText>

      <GuideDemo
        html={cardHtml}
      />
    </GuideSection>

    <GuideSection
      title="CardGroup"
      source={[{
        type: GuideSectionTypes.HTML,
        code: cardGroupHtml,
      }]}
    >
      <GuideDemo
        html={cardGroupHtml}
      />
    </GuideSection>
  </GuidePage>
);

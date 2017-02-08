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

const titleHtml = require('./title.html');
const subTitleHtml = require('./sub_title.html');
const textHtml = require('./text.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Title"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: titleHtml,
      }]}
    >
      <GuideText>
        Works well with an <GuideCode>h1</GuideCode>.
      </GuideText>

      <GuideDemo
        html={titleHtml}
      />
    </GuideSection>

    <GuideSection
      title="SubTitle"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: subTitleHtml,
      }]}
    >
      <GuideText>
        Works well with an <GuideCode>h2</GuideCode>.
      </GuideText>

      <GuideDemo
        html={subTitleHtml}
      />
    </GuideSection>

    <GuideSection
      title="Text"
      source={[{
        type: GuideSection.TYPES.HTML,
        code: textHtml,
      }]}
    >
      <GuideText>
        Works well with a <GuideCode>p</GuideCode>.
      </GuideText>

      <GuideDemo
        html={textHtml}
      />
    </GuideSection>
  </GuidePage>
);

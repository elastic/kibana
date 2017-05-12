import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const expressionHtml = require('./expression.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Title"
      source={[{
        type: GuideSectionTypes.HTML,
        code: expressionHtml,
      }]}
    >
      <GuideText>
       Expressions allow you to compress a complicated form into a small space.
      </GuideText>

      <GuideDemo
        html={expressionHtml}
      />
    </GuideSection>

  </GuidePage>
);


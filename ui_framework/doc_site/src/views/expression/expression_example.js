import React from 'react';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const expressionHtml = require('./expression.html');
const expressionJs = require('raw!./expression.js');


export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Expression builder"
      source={[{
        type: GuideSectionTypes.HTML,
        code: expressionHtml,
      }, {
        type: GuideSectionTypes.JS,
        code: expressionJs,
      }]}
    >
      <GuideText>
        Expressions allow you to compress a complicated form into a small space.
        Left aligned to the button by default. Can be optionally right aligned (as in the last example).
      </GuideText>

      <GuideDemo
        html={expressionHtml}
        js={expressionJs}
      />
    </GuideSection>

  </GuidePage>
);


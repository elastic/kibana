import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

const Expression = require('./expression');
const expressionSource = require('!!raw!./expression');
const expressionHtml = renderToHtml(Expression, { defaultActiveButton: 'example2' });

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ExpressionItem"
      source={[{
        type: GuideSectionTypes.JS,
        code: expressionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: expressionHtml,
      }]}
    >
      <GuideText>
        ExpressionItems allow you to compress a complicated form into a small space.
        Left aligned to the button by default. Can be optionally right aligned (as in the last example).
      </GuideText>

      <GuideDemo>
        <Expression defaultActiveButton="example2"/>
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);

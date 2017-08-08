import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';
const Expression = require('./expression_new');

const expressionHtml = require('./expression.html');
const expressionJs = require('raw!./expression.js');
const expressionSource = require('!!raw!./expression_new');
const expressionHtml2 = renderToHtml(Expression);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="ExpressionItem"
      source={[{
        type: GuideSectionTypes.HTML,
        code: expressionHtml,
      }, {
        type: GuideSectionTypes.JS,
        code: expressionJs,
      }]}
    >
      <GuideText>
        ExpressionItems allow you to compress a complicated form into a small space.
        Left aligned to the button by default. Can be optionally right aligned (as in the last example).
      </GuideText>

      <GuideDemo
        html={expressionHtml}
        js={expressionJs}
      />
    </GuideSection>
    <GuideSection
      title="ExpressionItem"
      source={[{
        type: GuideSectionTypes.JS,
        code: expressionSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: expressionHtml2,
      }]}
    >
      <GuideText>
        ExpressionItems allow you to compress a complicated form into a small space.
        Left aligned to the button by default. Can be optionally right aligned (as in the last example).
      </GuideText>

      <GuideDemo>
        <Expression />
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);

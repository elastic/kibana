import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import { EmptyTablePrompt } from './empty_table_prompt';
const emptyTablePromptSource = require('!!raw!./empty_table_prompt');
const emptyTablePromptHtml = renderToHtml(EmptyTablePrompt);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Empty table prompt"
      source={[{
        type: GuideSectionTypes.JS,
        code: emptyTablePromptSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: emptyTablePromptHtml,
      }]}
    >
      <GuideText>
        Use this prompt when a table has no results. It helps create space and provides a place to prompt the user
        to follow some next actions, such as creating an item.
      </GuideText>

      <GuideDemo>
        <EmptyTablePrompt/>
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

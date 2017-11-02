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
const emptyTablePromptSource = require('!!raw-loader!./empty_table_prompt');
const emptyTablePromptHtml = renderToHtml(EmptyTablePrompt);

import { ControlledTableWithEmptyPrompt } from './table_with_empty_prompt';
const tableWithEmptyPromptSource = require('!!raw-loader!./table_with_empty_prompt');
const tableWithEmptyPromptHtml = renderToHtml(ControlledTableWithEmptyPrompt);

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

    <GuideSection
      title="Controlled table with empty table prompt"
      source={[{
        type: GuideSectionTypes.JS,
        code: tableWithEmptyPromptSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: tableWithEmptyPromptHtml,
      }]}
    >
      <GuideText>
        Wrap in an EmptyTablePromptPanel when using with a controlled table.
      </GuideText>

      <GuideDemo>
        <ControlledTableWithEmptyPrompt/>
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import { PromptForItems } from './prompt_for_items';
const promptForItemsSource = require('!!raw!./prompt_for_items');
const promptForItemsHtml = renderToHtml(PromptForItems);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Prompt for Items"
      source={[{
        type: GuideSectionTypes.JS,
        code: promptForItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: promptForItemsHtml,
      }]}
    >
      <GuideText>
        Use the prompt to create new items.
      </GuideText>

      <GuideDemo>
        <PromptForItems/>
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

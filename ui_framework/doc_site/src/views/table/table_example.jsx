import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

const tableHtml = require('./table.html');
const tableJs = require('raw!./table.js');
const controlledTableHtml = require('./controlled_table.html');
const controlledTableWithLoadingItemsHtml = require('./controlled_table_loading_items.html');
const controlledTableWithNoItemsHtml = require('./controlled_table_no_items.html');
const controlledTableWithPromptForItemsHtml = require('./controlled_table_prompt_for_items.html');

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Table"
      source={[{
        type: GuideSectionTypes.HTML,
        code: tableHtml,
      }, {
        type: GuideSectionTypes.JS,
        code: tableJs,
      }]}
    >
      <GuideDemo
        html={tableHtml}
        js={tableJs}
      />
    </GuideSection>

    <GuideSection
      title="ControlledTable"
      source={[{
        type: GuideSectionTypes.HTML,
        code: controlledTableHtml,
      }]}
    >
      <GuideDemo
        html={controlledTableHtml}
      />
    </GuideSection>

    <GuideSection
      title="ControlledTable with LoadingItems"
      source={[{
        type: GuideSectionTypes.HTML,
        code: controlledTableWithLoadingItemsHtml,
      }]}
    >
      <GuideDemo
        html={controlledTableWithLoadingItemsHtml}
      />
    </GuideSection>

    <GuideSection
      title="ControlledTable with NoItems"
      source={[{
        type: GuideSectionTypes.HTML,
        code: controlledTableWithNoItemsHtml,
      }]}
    >
      <GuideDemo
        html={controlledTableWithNoItemsHtml}
      />
    </GuideSection>

    <GuideSection
      title="ControlledTable with PromptForItems"
      source={[{
        type: GuideSectionTypes.HTML,
        code: controlledTableWithPromptForItemsHtml,
      }]}
    >
      <GuideDemo
        html={controlledTableWithPromptForItemsHtml}
      />
    </GuideSection>
  </GuidePage>
);

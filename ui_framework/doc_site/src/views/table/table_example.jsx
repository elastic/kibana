import React, {
  Component,
  PropTypes,
} from 'react';

import {
  GuideDemo,
  GuideLink,
  GuidePage,
  GuideSection,
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
        type: GuideSection.TYPES.HTML,
        code: tableHtml,
      }, {
        type: GuideSection.TYPES.JS,
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
        type: GuideSection.TYPES.HTML,
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
        type: GuideSection.TYPES.HTML,
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
        type: GuideSection.TYPES.HTML,
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
        type: GuideSection.TYPES.HTML,
        code: controlledTableWithPromptForItemsHtml,
      }]}
    >
      <GuideDemo
        html={controlledTableWithPromptForItemsHtml}
      />
    </GuideSection>
  </GuidePage>
);

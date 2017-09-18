import React from 'react';
import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import { Table } from './table';
const tableSource = require('!!raw!./table');
const tableHtml = renderToHtml(Table);

import { TableWithMenuButtons } from './table_with_menu_buttons';
const tableWithMenuButtonsSource = require('!!raw!./table_with_menu_buttons');
const tableWithMenuButtonsHtml = renderToHtml(TableWithMenuButtons);

import { FluidTable } from './fluid_table';
const fluidTableSource = require('!!raw!./fluid_table');
const fluidTableHtml = renderToHtml(FluidTable);

import { ControlledTable } from './controlled_table';
const controlledTableSource = require('!!raw!./controlled_table');
const controlledTableHtml = renderToHtml(ControlledTable);

import { ControlledTableWithEmptyPrompt } from './controlled_table_with_empty_prompt';
const controlledTableWithEmptyPromptSource = require('!!raw!./controlled_table_with_empty_prompt');
const controlledTableWithEmptyPromptHtml = renderToHtml(ControlledTableWithEmptyPrompt);

import { ControlledTableWithNoItems } from './controlled_table_with_no_items';
const controlledTableWithNoItemsSource = require('!!raw!./controlled_table_with_no_items');
const controlledTableWithNoItemsHtml = renderToHtml(ControlledTableWithNoItems);

import { ControlledTableLoadingItems } from './controlled_table_loading_items';
const controlledTableLoadingItemsSource = require('!!raw!./controlled_table_loading_items');
const controlledTableLoadingItemsHtml = renderToHtml(ControlledTableLoadingItems);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Table"
      source={[{
        type: GuideSectionTypes.JS,
        code: tableSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: tableHtml,
      }]}
    >
      <GuideText>
        Here&rsquo;s the basic Table. You can expand and collapse rows.
      </GuideText>

      <GuideDemo>
        <Table />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Fluid Table"
      source={[{
        type: GuideSectionTypes.JS,
        code: fluidTableSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: fluidTableHtml,
      }]}
    >
      <GuideText>
        For when you want the content of a table&rsquo;s cells to determine its width.
      </GuideText>

      <GuideDemo>
        <FluidTable />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Table with MenuButtons"
      source={[{
        type: GuideSectionTypes.JS,
        code: tableWithMenuButtonsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: tableWithMenuButtonsHtml,
      }]}
    >
      <GuideDemo>
        <TableWithMenuButtons />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ControlledTable"
      source={[{
        type: GuideSectionTypes.JS,
        code: controlledTableSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: controlledTableHtml,
      }]}
    >
      <GuideDemo>
        <ControlledTable />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ControlledTable with loading items"
      source={[{
        type: GuideSectionTypes.JS,
        code: controlledTableLoadingItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: controlledTableLoadingItemsHtml,
      }]}
    >
      <GuideDemo>
        <ControlledTableLoadingItems />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ControlledTable with no items"
      source={[{
        type: GuideSectionTypes.JS,
        code: controlledTableWithNoItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: controlledTableWithNoItemsHtml,
      }]}
    >
      <GuideDemo>
        <ControlledTableWithNoItems />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ControlledTable with EmptyTablePrompt"
      source={[{
        type: GuideSectionTypes.JS,
        code: controlledTableWithEmptyPromptSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: controlledTableWithEmptyPromptHtml,
      }]}
    >
      <GuideDemo>
        <ControlledTableWithEmptyPrompt />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

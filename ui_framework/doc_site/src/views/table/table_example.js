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
const tableSource = require('!!raw-loader!./table');
const tableHtml = renderToHtml(Table);

import { TableWithMenuButtons } from './table_with_menu_buttons';
const tableWithMenuButtonsSource = require('!!raw-loader!./table_with_menu_buttons');
const tableWithMenuButtonsHtml = renderToHtml(TableWithMenuButtons);

import { FluidTable } from './fluid_table';
const fluidTableSource = require('!!raw-loader!./fluid_table');
const fluidTableHtml = renderToHtml(FluidTable);

import { ListingTable } from './listing_table';
const listingTableSource = require('!!raw-loader!./listing_table');
const listingTableHtml = renderToHtml(ListingTable);

import { ListingTableWithEmptyPrompt } from './listing_table_with_empty_prompt';
const listingTableWithEmptyPromptSource = require('!!raw-loader!./listing_table_with_empty_prompt');
const listingTableWithEmptyPromptHtml = renderToHtml(ListingTableWithEmptyPrompt);

import { ListingTableWithNoItems } from './listing_table_with_no_items';
const listingTableWithNoItemsSource = require('!!raw-loader!./listing_table_with_no_items');
const listingTableWithNoItemsHtml = renderToHtml(ListingTableWithNoItems);

import { ListingTableLoadingItems } from './listing_table_loading_items';
const listingTableLoadingItemsSource = require('!!raw-loader!./listing_table_loading_items');
const listingTableLoadingItemsHtml = renderToHtml(ListingTableLoadingItems);

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
      title="ListingTable"
      source={[{
        type: GuideSectionTypes.JS,
        code: listingTableSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: listingTableHtml,
      }]}
    >
      <GuideDemo>
        <ListingTable />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ListingTable with loading items"
      source={[{
        type: GuideSectionTypes.JS,
        code: listingTableLoadingItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: listingTableLoadingItemsHtml,
      }]}
    >
      <GuideDemo>
        <ListingTableLoadingItems />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ListingTable with no items"
      source={[{
        type: GuideSectionTypes.JS,
        code: listingTableWithNoItemsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: listingTableWithNoItemsHtml,
      }]}
    >
      <GuideDemo>
        <ListingTableWithNoItems />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="ListingTable with EmptyTablePrompt"
      source={[{
        type: GuideSectionTypes.JS,
        code: listingTableWithEmptyPromptSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: listingTableWithEmptyPromptHtml,
      }]}
    >
      <GuideDemo>
        <ListingTableWithEmptyPrompt />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

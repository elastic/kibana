import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideCode,
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Pagination from './pagination';
const paginationSource = require('!!raw!./pagination');
const paginationHtml = renderToHtml(Pagination);

import PaginationNearStart from './pagination_near_start';
const paginationNearStartSource = require('!!raw!./pagination_near_start');
const paginationNearStartHtml = renderToHtml(PaginationNearStart);

import PaginationAtEnd from './pagination_at_end';
const paginationAtEndSource = require('!!raw!./pagination_at_end');
const paginationAtEndHtml = renderToHtml(PaginationAtEnd);

import PaginationLotsMiddle from './pagination_lots_middle';
const paginationLotsMiddleSource = require('!!raw!./pagination_lots_middle');
const paginationLotsMiddleHtml = renderToHtml(PaginationLotsMiddle);

import PaginationLayouts from './pagination_layouts';
const paginationLayoutsSource = require('!!raw!./pagination_layouts');
const paginationLayoutsHtml = renderToHtml(PaginationLayouts);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Pagination, first page, low amount of pages"
      source={[{
        type: GuideSectionTypes.JS,
        code: paginationSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: paginationHtml,
      }]}
    >
      <GuideText>
        Note that previous button or first/last page are not shown. We should only show
        at most 5 pages.
      </GuideText>

      <GuideDemo>
        <Pagination />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Pagination, second page, low amount of pages"
      source={[{
        type: GuideSectionTypes.JS,
        code: paginationNearStartSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: paginationNearStartHtml,
      }]}
    >
      <GuideText>
        In this example there are ONLY 5 pages in the list.
      </GuideText>

      <GuideDemo>
        <PaginationNearStart />
      </GuideDemo>
    </GuideSection>
    <GuideSection
      title="Pagination, last page, low amount of pages"
      source={[{
        type: GuideSectionTypes.JS,
        code: paginationAtEndSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: paginationAtEndHtml,
      }]}
    >
      <GuideText>
        When the last page is active we don&rsquo;t show the last page skip or the next button.
      </GuideText>

      <GuideDemo>
        <PaginationAtEnd />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pagination, lots of pages, in the middle"
      source={[{
        type: GuideSectionTypes.JS,
        code: paginationLotsMiddleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: paginationLotsMiddleHtml,
      }]}
    >
      <GuideText>
        When there are pages before or behind the current set of 5 pages, we should provide
        a quick way to jump back to first or last page. This is doubly important for
        accessibility.
      </GuideText>

      <GuideDemo>
        <PaginationLotsMiddle />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pagination layouts"
      source={[{
        type: GuideSectionTypes.JS,
        code: paginationLayoutsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: paginationLayoutsHtml,
      }]}
    >
      <GuideText>
        Below are some common layout examples for pagination. In both cases we use
        <GuideCode>FlexGroup</GuideCode> to set up the layout.
      </GuideText>

      <GuideDemo>
        <PaginationLayouts />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

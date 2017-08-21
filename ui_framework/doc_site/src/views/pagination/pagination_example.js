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
        Description needed: how to use the <GuideCode>Pagination</GuideCode> component.
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
        Description needed: how to use the <GuideCode>Pagination</GuideCode> component.
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
        Description needed: how to use the <GuideCode>Pagination</GuideCode> component.
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
        Description needed: how to use the <GuideCode>Pagination</GuideCode> component.
      </GuideText>

      <GuideDemo>
        <PaginationLotsMiddle />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Pagination, with results"
      source={[{
        type: GuideSectionTypes.JS,
        code: paginationLayoutsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: paginationLayoutsHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the <GuideCode>Pagination</GuideCode> component.
      </GuideText>

      <GuideDemo>
        <PaginationLayouts />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

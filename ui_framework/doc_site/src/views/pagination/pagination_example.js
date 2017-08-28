import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuidePage,
  GuideSection,
  GuideSectionTypes,
} from '../../components';

import {
  KuiCode,
} from '../../../../components';

import ManyPages from './many_pages';
const manyPagesSource = require('!!raw!./many_pages');
const manyPagesnHtml = renderToHtml(ManyPages);

import FewPages from './few_pages';
const fewPagesSource = require('!!raw!./few_pages');
const fewPagesnHtml = renderToHtml(FewPages);

import PaginationLayouts from './pagination_layouts';
const paginationLayoutsSource = require('!!raw!./pagination_layouts');
const paginationLayoutsHtml = renderToHtml(PaginationLayouts);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Many pages"
      source={[{
        type: GuideSectionTypes.JS,
        code: manyPagesSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: manyPagesnHtml,
      }]}
      text={
        <p>
          We only show at most 5 consecutive pages, with shortcuts to the first and/or last page.
        </p>
      }
      demo={
        <ManyPages />
      }
    />

    <GuideSection
      title="Few pages"
      source={[{
        type: GuideSectionTypes.JS,
        code: fewPagesSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: fewPagesnHtml,
      }]}
      text={
        <p>
          The UI simplifies when we have fewer than the maximum number of visible pages.
        </p>
      }
      demo={
        <FewPages />
      }
    />

    <GuideSection
      title="Pagination layouts"
      source={[{
        type: GuideSectionTypes.JS,
        code: paginationLayoutsSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: paginationLayoutsHtml,
      }]}
      text={
        <p>
          Below are some common layout examples for pagination. In both cases we use
          <KuiCode>FlexGroup</KuiCode> to set up the layout.
        </p>
      }
      demo={
        <PaginationLayouts />
      }
    />
  </GuidePage>
);

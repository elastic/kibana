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

import { Compressed } from './compressed';
const compressedSource = require('!!raw!./compressed');
const compressedHtml = renderToHtml(Compressed);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Table"
      source={[{
        type: GuideSectionTypes.HTML,
        code: tableHtml,
      }, {
        type: GuideSectionTypes.JS,
        code: tableSource,
      }]}
    >
      <GuideText>
        Here&rsquo;s the basic Table. This example has sortable headers which respond to mouse
        interaction and exhibit the desired behavior, and selectable rows.
      </GuideText>

      <GuideDemo>
        <Table />
      </GuideDemo>
    </GuideSection>

    <GuideSection
      title="Compressed"
      source={[{
        type: GuideSectionTypes.HTML,
        code: compressedHtml,
      }, {
        type: GuideSectionTypes.JS,
        code: compressedSource,
      }]}
    >
      <GuideDemo>
        <Compressed />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

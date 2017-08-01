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
        Here&rsquo;s the basic Table.
      </GuideText>

      <GuideDemo>
        <Table />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

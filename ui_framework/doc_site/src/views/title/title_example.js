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

import Title from './title';
const titleSource = require('!!raw!./title');
const titleHtml = renderToHtml(Title);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Titles"
      source={[{
        type: GuideSectionTypes.JS,
        code: titleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: titleHtml,
      }]}
    >
      <GuideText>
        Titles style the page, section and content headings we use in Kibana. They
        can contain any markup, but usually contain a heading tag of some sort.
        Unlike <GuideCode>KuiText</GuideCode> they are margin neutral and more
        suitable for general layout design.
      </GuideText>

      <GuideDemo>
        <Title />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

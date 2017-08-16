import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import <%= componentExampleName %> from './<%= fileName %>';
const <%= componentExamplePrefix %>Source = require('!!raw!./<%= fileName %>');
const <%= componentExamplePrefix %>Html = renderToHtml(<%= componentExampleName %>);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="<%= componentExampleName %>"
      source={[{
        type: GuideSectionTypes.JS,
        code: <%= componentExamplePrefix %>Source,
      }, {
        type: GuideSectionTypes.HTML,
        code: <%= componentExamplePrefix %>Html,
      }]}
    >
      <GuideText>
        Description needed: how to use the <%= componentExampleName %> component.
      </GuideText>

      <GuideDemo>
        <<%= componentExampleName %> />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

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
      text={
        <p>
          Description needed: how to use the <KuiCode><%= componentExampleName %></KuiCode> component.
        </p>
      }
      demo={<<%= componentExampleName %> />}
    />
  </GuidePage>
);

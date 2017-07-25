import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideText,
  GuideSectionTypes,
} from '../../components';

import Header from './header';
const headerSource = require('!!raw!./header');
const headerHtml = renderToHtml(Header);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Header"
      source={[{
        type: GuideSectionTypes.JS,
        code: headerSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: headerHtml,
      }]}
    >
      <GuideText>
        Global navigation, user state, and controls.
      </GuideText>

      <GuideDemo>
        <Header />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

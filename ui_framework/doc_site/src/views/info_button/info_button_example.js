import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Basic from './info_button';

const basicSource = require('!!raw!./info_button');
const basicHtml = renderToHtml(Basic);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Info Button"
      source={[{
        type: GuideSectionTypes.JS,
        code: basicSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: basicHtml,
      }]}
    >
      <GuideText>
        Use the Info Button as a trigger to provide some helpful inline content. For example, use it as a tooltip trigger.
      </GuideText>

      <GuideDemo>
        <Basic />
      </GuideDemo>

      <GuideDemo isDarkTheme={true}>
        <Basic />
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);

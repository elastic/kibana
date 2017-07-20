import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Example from './info_button';

const basicSource = require('!!raw!./info_button');
const basicHtml = renderToHtml(Example);

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
        This is just button with an info icon, used for a keyboard-accessible
        trigger for helpful inline content. For example, use it as a tooltip
        trigger.
      </GuideText>

      <GuideDemo>
        <Example />
      </GuideDemo>
    </GuideSection>

  </GuidePage>
);

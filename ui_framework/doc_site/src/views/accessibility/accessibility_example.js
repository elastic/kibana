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

import KeyboardAccessible from './keyboard_accessible';
const keyboardAccessibleSource = require('!!raw!./keyboard_accessible');
const keyboardAccessibleHtml = renderToHtml(KeyboardAccessible);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="KeyboardAccessible"
      source={[{
        type: GuideSectionTypes.JS,
        code: keyboardAccessibleSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: keyboardAccessibleHtml,
      }]}
    >
      <GuideText>
        You can make interactive elements keyboard-accessible with this component. This is necessary
        for non-button elements and <GuideCode>a</GuideCode> tags without
        <GuideCode>href</GuideCode> attributes.
      </GuideText>

      <GuideDemo>
        <KeyboardAccessible />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

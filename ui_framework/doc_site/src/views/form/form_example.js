import React from 'react';

import { renderToHtml } from '../../services';

import {
  GuideDemo,
  GuidePage,
  GuideSection,
  GuideSectionTypes,
  GuideText,
} from '../../components';

import Form from './form';
const formSource = require('!!raw!./form');
const formHtml = renderToHtml(Form);

export default props => (
  <GuidePage title={props.route.name}>
    <GuideSection
      title="Form"
      source={[{
        type: GuideSectionTypes.JS,
        code: formSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the Form component.
      </GuideText>

      <GuideDemo>
        <Form />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);

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

import FormValidation from './form_validation';
const formValidationSource = require('!!raw!./form_validation');
const formValidationHtml = renderToHtml(FormValidation);

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
    <GuideSection
      title="Form validation"
      source={[{
        type: GuideSectionTypes.JS,
        code: formValidationSource,
      }, {
        type: GuideSectionTypes.HTML,
        code: formValidationHtml,
      }]}
    >
      <GuideText>
        Description needed: how to use the Form component.
      </GuideText>

      <GuideDemo>
        <FormValidation />
      </GuideDemo>
    </GuideSection>
  </GuidePage>
);
